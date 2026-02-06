import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig, validateConfig, summarizeConfig } from './core/config.js';
import { DatadogClient } from './core/http-client.js';
import { parseSchema } from './core/schema-parser.js';
import { log, info, warn, error as logError, setMcpServer } from './core/logger.js';
import { createCoreTool, createToolResponse } from './tools/core-tools.js';
import { CURATED_TOOLS } from './tools/curated-tools.js';
import { CRUD_TOOLS } from './tools/crud-tools.js';
import { registerResources } from './resources/datadog-resources.js';
import { registerPrompts } from './prompts/datadog-prompts.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, '..', 'package.json');

function getVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export class DatadogMcpServer {
  constructor(config) {
    this.config = config;
    this.client = new DatadogClient(config);
    this.server = new McpServer({
      name: 'mcp-datadog-server',
      version: getVersion(),
    });
    this.tools = new Map();
  }

  async initialize() {
    const validation = validateConfig(this.config);

    if (validation.errors.length > 0) {
      logError(`Configuration errors: ${validation.errors.join(', ')}`);
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      warn(`Configuration warnings: ${validation.warnings.join(', ')}`);
    }

    info(`Starting server with config: ${JSON.stringify(summarizeConfig(this.config))}`);

    this.registerCuratedTools();
    this.registerCrudTools();

    if (validation.schemaExists) {
      this.registerSchemaTools();
    } else {
      warn('Schema file not found, only curated and CRUD tools available');
    }

    registerResources(this.server, this.client, this.config);
    registerPrompts(this.server);

    info(`Registered ${this.tools.size} tools total`);
  }

  /**
   * Register curated tools using McpServer.tool() with proper Zod raw shapes.
   * Curated tools are hand-crafted, optimized tools for common operations.
   */
  registerCuratedTools() {
    let count = 0;

    for (const [name, tool] of Object.entries(CURATED_TOOLS)) {
      const client = this.client;
      const config = this.config;

      this.server.tool(
        name,
        tool.description,
        tool.schema,
        tool.annotations,
        async (args) => {
          try {
            return await tool.execute(args, client, config);
          } catch (err) {
            logError(`Error in curated tool ${name}: ${err.message}`);
            return createToolResponse(null, err);
          }
        }
      );

      this.tools.set(name, { type: 'curated', tool });
      count++;
    }

    info(`Registered ${count} curated tools`);
  }

  /**
   * Register CRUD tools using McpServer.tool() with proper Zod raw shapes.
   * CRUD tools are auto-generated from Datadog resource definitions.
   * Skips tools that conflict with curated tool names.
   */
  registerCrudTools() {
    let count = 0;

    for (const [name, tool] of Object.entries(CRUD_TOOLS)) {
      if (this.tools.has(name)) {
        warn(`Skipping duplicate CRUD tool: ${name} (curated version exists)`);
        continue;
      }

      const client = this.client;

      this.server.tool(
        name,
        tool.description,
        tool.schema,
        tool.annotations,
        async (args) => {
          try {
            return await tool.execute(args, client);
          } catch (err) {
            logError(`Error in CRUD tool ${name}: ${err.message}`);
            return createToolResponse(null, err);
          }
        }
      );

      this.tools.set(name, { type: 'crud', tool });
      count++;
    }

    info(`Registered ${count} CRUD tools`);
  }

  /**
   * Register schema-generated tools from the Postman API collection.
   * Creates Zod raw shapes dynamically from schema operation parameters.
   * Skips tools that conflict with curated or CRUD tool names.
   */
  registerSchemaTools() {
    const { operations, categories } = parseSchema(this.config.schemaPath, this.config.allowedFolders);

    info(`Found ${operations.length} operations across ${categories.length} categories`);

    if (this.config.allowedFolders) {
      info(`Filtering to categories: ${this.config.allowedFolders.join(', ')}`);
    }

    let count = 0;

    for (const operation of operations) {
      if (this.tools.has(operation.name)) {
        continue;
      }

      const tool = createCoreTool(operation, this.client);
      const zodShape = this.createZodShapeFromOperation(operation);
      const isReadOnly = operation.method === 'GET' || operation.method === 'HEAD';
      const isDestructive = operation.method === 'DELETE';

      const annotations = {
        readOnlyHint: isReadOnly,
        destructiveHint: isDestructive,
        idempotentHint: isReadOnly || operation.method === 'PUT' || operation.method === 'DELETE',
        openWorldHint: true,
      };

      this.server.tool(
        operation.name,
        operation.description,
        zodShape,
        annotations,
        async (args) => {
          try {
            return await tool.execute(args);
          } catch (err) {
            logError(`Error in generated tool ${operation.name}: ${err.message}`);
            return createToolResponse(null, err);
          }
        }
      );

      this.tools.set(operation.name, { type: 'generated', operation });
      count++;
    }

    info(`Registered ${count} generated tools`);
  }

  /**
   * Create a Zod raw shape from an operation definition.
   * Maps path params, query params, and body to Zod types
   * that the MCP SDK can natively convert to JSON Schema.
   */
  createZodShapeFromOperation(operation) {
    const shape = {};

    if (operation.pathParams && typeof operation.pathParams === 'object') {
      for (const [name, param] of Object.entries(operation.pathParams)) {
        shape[name] = z.string().describe(param.description || `Path parameter: ${name}`);
      }
    }

    if (operation.queryParams && typeof operation.queryParams === 'object') {
      for (const [name, param] of Object.entries(operation.queryParams)) {
        let field = z.string().describe(param.description || `Query parameter: ${name}`);
        if (!param.required) {
          field = field.optional();
        }
        shape[name] = field;
      }
    }

    if (['POST', 'PUT', 'PATCH'].includes(operation.method.toUpperCase())) {
      shape.body = z.record(z.unknown()).optional().describe('Request body (JSON object)');
    }

    return shape;
  }

  async start() {
    await this.initialize();

    // Wire up MCP logging after connection
    setMcpServer(this.server);

    await this.server.connect(new StdioServerTransport());
    info('Server started on stdio transport');
  }

  /**
   * Get summary info about all registered tools.
   * Used by CLI commands for introspection.
   */
  getToolsInfo(detailed = false) {
    const toolsInfo = {
      total: this.tools.size,
      curated: 0,
      crud: 0,
      generated: 0,
      categories: new Set(),
      tools: [],
    };

    const toolsList = [];

    for (const [name, info] of this.tools) {
      const toolInfo = {
        name,
        type: info.type,
        description: this.getToolDescription(info),
        category: this.getToolCategory(info),
      };

      toolsList.push(toolInfo);

      if (info.type === 'curated') {
        toolsInfo.curated++;
        toolsInfo.categories.add('curated');
      } else if (info.type === 'crud') {
        toolsInfo.crud++;
        toolsInfo.categories.add('crud');
      } else {
        toolsInfo.generated++;
        toolsInfo.categories.add(info.operation.category);
      }
    }

    toolsList.sort((a, b) => a.name.localeCompare(b.name));

    return {
      ...toolsInfo,
      categories: Array.from(toolsInfo.categories).sort(),
      tools: detailed ? toolsList : undefined,
    };
  }

  getToolInfo(toolName) {
    const info = this.tools.get(toolName);
    if (!info) return null;

    return {
      name: toolName,
      type: info.type,
      description: this.getToolDescription(info),
      category: this.getToolCategory(info),
    };
  }

  getToolDescription(info) {
    if (info.type === 'curated') return info.tool.description;
    if (info.type === 'crud') return info.tool.description;
    return info.operation.description;
  }

  getToolCategory(info) {
    if (info.type === 'curated') return 'curated';
    if (info.type === 'crud') return 'crud';
    return info.operation.category;
  }
}

export async function createServer(options = {}) {
  const config = loadConfig(options.env || process.env);

  if (options.schemaPath) {
    config.schemaPath = path.resolve(process.cwd(), options.schemaPath);
  }

  if (options.folders) {
    config.allowedFolders = Array.isArray(options.folders)
      ? options.folders
      : options.folders.split(',').map(f => f.trim()).filter(Boolean);
  }

  Object.assign(config, options);

  const server = new DatadogMcpServer(config);
  await server.initialize();
  return server;
}
