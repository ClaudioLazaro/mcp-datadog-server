import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, validateConfig, summarizeConfig } from './core/config.js';
import { DatadogClient } from './core/http-client.js';
import { parseSchema, createToolSchema } from './core/schema-parser.js';
import { createCoreTool, formatToolName } from './tools/core-tools.js';
import { CURATED_TOOLS } from './tools/curated-tools.js';
import { CRUD_TOOLS } from './tools/crud-tools.js';
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

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
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
      log(`Configuration errors: ${validation.errors.join(', ')}`, 'error');
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      log(`Configuration warnings: ${validation.warnings.join(', ')}`, 'warn');
    }
    
    log(`Starting server with config: ${JSON.stringify(summarizeConfig(this.config))}`);

    this.registerCuratedTools();
    this.registerCrudTools();

    if (validation.schemaExists) {
      this.registerSchemaTools();
    } else {
      log('Schema file not found, only curated and CRUD tools available', 'warn');
    }

    log(`Registered ${this.tools.size} tools total`);
  }

  registerCuratedTools() {
    let count = 0;
    
    for (const [name, tool] of Object.entries(CURATED_TOOLS)) {
      this.server.registerTool(
        name,
        {
          title: formatToolName(name),
          description: tool.description,
          inputSchema: tool.schema,
          annotations: {
            category: 'curated',
            type: 'high-level',
            source: 'handcrafted',
            complexity: tool.complexity || 'medium',
            datadog: {
              api: tool.api || 'v1',
              endpoint: tool.endpoint,
              methods: tool.supportedMethods || ['GET'],
              rateLimit: tool.rateLimit || 'standard',
              authentication: ['api_key', 'app_key'],
            },
            usage: {
              frequency: tool.usage?.frequency || 'common',
              audience: tool.usage?.audience || ['developers', 'sre', 'ops'],
              examples: tool.usage?.examples || [],
            },
          },
        },
        async (args, progressCallback) => {
          try {
            return await tool.execute(args, this.client, this.config, progressCallback);
          } catch (error) {
            log(`Error in curated tool ${name}: ${error.message}`, 'error');
            return {
              isError: true,
              content: [{ type: 'text', text: `Tool failed: ${error.message}` }],
            };
          }
        }
      );
      
      this.tools.set(name, { type: 'curated', tool });
      count++;
    }
    
    log(`Registered ${count} curated tools`);
  }

  registerCrudTools() {
    let count = 0;

    for (const [name, tool] of Object.entries(CRUD_TOOLS)) {
      if (this.tools.has(name)) {
        log(`Skipping duplicate CRUD tool: ${name}`, 'warn');
        continue;
      }

      this.server.registerTool(
        name,
        {
          title: formatToolName(name),
          description: tool.description,
          inputSchema: tool.schema,
          annotations: {
            category: 'crud',
            type: 'crud-operation',
            source: 'crud-generated',
            complexity: tool.complexity,
            datadog: {
              api: tool.api,
              endpoint: tool.endpoint,
              methods: tool.supportedMethods,
              rateLimit: tool.rateLimit,
              authentication: ['api_key', 'app_key'],
            },
            usage: {
              frequency: tool.usage.frequency,
              audience: tool.usage.audience,
              examples: tool.usage.examples,
            },
            resource: {
              name: name.split('_')[1], // extract resource name from tool name
              operation: name.split('_')[0], // extract operation from tool name
            },
          },
        },
        async (args, progressCallback) => {
          try {
            return await tool.execute(args, this.client, this.config, progressCallback);
          } catch (error) {
            log(`Error in CRUD tool ${name}: ${error.message}`, 'error');
            return {
              isError: true,
              content: [{ type: 'text', text: `CRUD tool failed: ${error.message}` }],
            };
          }
        }
      );

      this.tools.set(name, { type: 'crud', tool });
      count++;
    }

    log(`Registered ${count} CRUD tools`);
  }

  registerSchemaTools() {
    const { operations, categories } = parseSchema(this.config.schemaPath, this.config.allowedFolders);
    
    log(`Found ${operations.length} operations across ${categories.length} categories`);
    
    if (this.config.allowedFolders) {
      log(`Filtering to categories: ${this.config.allowedFolders.join(', ')}`);
    }
    
    let count = 0;
    
    for (const operation of operations) {
      if (this.tools.has(operation.name)) {
        log(`Skipping duplicate tool: ${operation.name}`, 'warn');
        continue;
      }
      
      const tool = createCoreTool(operation, this.client);
      const schema = createToolSchema(operation);
      
      this.server.registerTool(
        operation.name,
        {
          title: formatToolName(operation.name),
          description: operation.description,
          inputSchema: schema,
          annotations: {
            category: operation.category,
            method: operation.method,
            type: 'generated',
            source: 'schema-generated',
            complexity: this.getOperationComplexity(operation),
            datadog: {
              api: operation.api || this.extractApiVersion(operation.rawUrlTemplate),
              endpoint: operation.rawUrlTemplate,
              methods: [operation.method],
              rateLimit: this.getRateLimit(operation.category),
              authentication: ['api_key', 'app_key'],
              folder: operation.category,
            },
            schema: {
              hasPathParams: operation.pathParams && operation.pathParams.length > 0,
              hasQueryParams: operation.queryParams && operation.queryParams.length > 0,
              hasBody: ['POST', 'PUT', 'PATCH'].includes(operation.method.toUpperCase()),
              generatedAt: new Date().toISOString(),
            },
            usage: {
              frequency: this.getUsageFrequency(operation.category),
              audience: this.getTargetAudience(operation.category),
            },
          },
        },
        async (args, progressCallback) => {
          try {
            return await tool.execute(args, progressCallback);
          } catch (error) {
            log(`Error in generated tool ${operation.name}: ${error.message}`, 'error');
            return {
              isError: true,
              content: [{ type: 'text', text: `Tool failed: ${error.message}` }],
            };
          }
        }
      );
      
      this.tools.set(operation.name, { type: 'generated', operation });
      count++;
    }
    
    log(`Registered ${count} generated tools`);
  }

  // Helper methods for enhanced annotations
  getOperationComplexity(operation) {
    const hasPathParams = operation.pathParams && operation.pathParams.length > 0;
    const hasQueryParams = operation.queryParams && operation.queryParams.length > 0;
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(operation.method.toUpperCase());

    if (hasPathParams && hasQueryParams && hasBody) return 'high';
    if ((hasPathParams || hasQueryParams) && hasBody) return 'medium';
    if (hasPathParams || hasQueryParams || hasBody) return 'low';
    return 'simple';
  }

  extractApiVersion(url) {
    const match = url.match(/\/api\/v(\d+)\//);
    return match ? `v${match[1]}` : 'v1';
  }

  getRateLimit(category) {
    const highVolumeCategories = ['Logs', 'Metrics', 'Events', 'Spans Metrics'];
    const mediumVolumeCategories = ['Dashboards', 'Monitors', 'Synthetics'];

    if (highVolumeCategories.includes(category)) return 'strict';
    if (mediumVolumeCategories.includes(category)) return 'moderate';
    return 'standard';
  }

  getUsageFrequency(category) {
    const frequentCategories = ['Dashboards', 'Monitors', 'Logs', 'Metrics'];
    const moderateCategories = ['Hosts', 'Events', 'Synthetics'];

    if (frequentCategories.includes(category)) return 'high';
    if (moderateCategories.includes(category)) return 'moderate';
    return 'low';
  }

  getTargetAudience(category) {
    const audienceMap = {
      'Dashboards': ['developers', 'sre', 'ops', 'business'],
      'Monitors': ['sre', 'ops', 'developers'],
      'Logs': ['developers', 'sre', 'support'],
      'Metrics': ['sre', 'ops', 'performance'],
      'Hosts': ['ops', 'infrastructure'],
      'Events': ['ops', 'sre', 'developers'],
      'Synthetics': ['qa', 'sre', 'developers'],
      'Security Monitoring': ['security', 'compliance'],
      'Teams': ['admin', 'management'],
      'Users': ['admin', 'hr'],
    };

    return audienceMap[category] || ['developers', 'ops'];
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

  getToolComplexity(info) {
    if (info.type === 'curated') return info.tool.complexity || 'medium';
    if (info.type === 'crud') return info.tool.complexity;
    return this.getOperationComplexity(info.operation);
  }

  getToolApi(info) {
    if (info.type === 'curated') return info.tool.api || 'v1';
    if (info.type === 'crud') return info.tool.api;
    return this.extractApiVersion(info.operation.rawUrlTemplate);
  }

  getToolMethod(info) {
    if (info.type === 'curated') return info.tool.supportedMethods?.[0] || 'GET';
    if (info.type === 'crud') return info.tool.supportedMethods[0];
    return info.operation.method;
  }

  async start() {
    await this.initialize();
    await this.server.connect(new StdioServerTransport());
    log('Server started on stdio transport');
  }

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
        complexity: this.getToolComplexity(info),
        api: this.getToolApi(info),
        method: this.getToolMethod(info),
        operations: {
          get: `get_${name}`,
          update: `update_${name}`,
          delete: `delete_${name}`,
        }
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

    // Sort tools alphabetically by name
    toolsList.sort((a, b) => a.name.localeCompare(b.name));

    return {
      ...toolsInfo,
      categories: Array.from(toolsInfo.categories).sort(),
      tools: detailed ? toolsList : undefined,
    };
  }

  getToolInfo(toolName) {
    const info = this.tools.get(toolName);
    if (!info) {
      return null;
    }

    const toolInfo = {
      name: toolName,
      type: info.type,
      description: this.getToolDescription(info),
      category: this.getToolCategory(info),
      complexity: this.getToolComplexity(info),
      api: this.getToolApi(info),
      method: this.getToolMethod(info),
      operations: {
        get: `get_${toolName}`,
        update: `update_${toolName}`,
        delete: `delete_${toolName}`,
      }
    };

    // Add additional info based on tool type
    if (info.type === 'curated') {
      toolInfo.endpoint = info.tool.endpoint;
      toolInfo.usage = info.tool.usage;
      toolInfo.rateLimit = info.tool.rateLimit;
    } else if (info.type === 'crud') {
      toolInfo.endpoint = info.tool.endpoint;
      toolInfo.usage = info.tool.usage;
      toolInfo.rateLimit = info.tool.rateLimit;
      toolInfo.resource = toolName.split('_').slice(1).join('_'); // extract resource name
      toolInfo.operation = toolName.split('_')[0]; // extract operation
    } else {
      toolInfo.endpoint = info.operation.rawUrlTemplate;
      toolInfo.pathParams = info.operation.pathParams || [];
      toolInfo.queryParams = info.operation.queryParams || [];
    }

    return toolInfo;
  }

  getToolSchema(toolName) {
    const info = this.tools.get(toolName);
    if (!info) {
      return null;
    }

    let schema = {};
    let examples = [];

    if (info.type === 'curated') {
      schema = {
        inputSchema: this.zodToJsonSchema(info.tool.schema),
        description: info.tool.description,
        type: 'curated'
      };
      examples = info.tool.usage?.examples?.map(example => {
        try {
          const parts = example.split(': ');
          return {
            description: parts[0],
            params: parts[1] ? JSON.parse(parts[1]) : {}
          };
        } catch (error) {
          return {
            description: example,
            params: {}
          };
        }
      }) || [];
    } else if (info.type === 'crud') {
      schema = {
        inputSchema: this.zodToJsonSchema(info.tool.schema),
        description: info.tool.description,
        type: 'crud',
        resource: toolName.split('_').slice(1).join('_'),
        operation: toolName.split('_')[0]
      };
      examples = info.tool.usage?.examples?.map(example => {
        try {
          const parts = example.split(': ');
          return {
            description: parts[0],
            params: parts[1] ? JSON.parse(parts[1]) : {}
          };
        } catch (error) {
          return {
            description: example,
            params: {}
          };
        }
      }) || [];
    } else {
      // Generated tools from schema
      schema = {
        inputSchema: this.createSchemaFromOperation(info.operation),
        description: info.operation.description,
        type: 'generated',
        category: info.operation.category
      };
    }

    // Extract required fields from JSON schema
    if (schema.inputSchema && schema.inputSchema.required) {
      schema.required = schema.inputSchema.required;
    }

    schema.examples = examples;
    return schema;
  }

  zodToJsonSchema(zodSchema) {
    // Convert Zod schema to JSON Schema format
    // This is a simplified conversion - in production you might want to use a library like zod-to-json-schema
    try {
      const shape = zodSchema._def.shape();
      const properties = {};
      const required = [];

      Object.entries(shape).forEach(([key, value]) => {
        const fieldSchema = this.convertZodField(value);
        properties[key] = fieldSchema;

        if (!value.isOptional()) {
          required.push(key);
        }
      });

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    } catch (error) {
      // Fallback for complex schemas
      return {
        type: 'object',
        description: 'Complex schema - see tool documentation'
      };
    }
  }

  convertZodField(zodField) {
    const def = zodField._def;

    if (def.typeName === 'ZodString') {
      return {
        type: 'string',
        description: def.description || undefined
      };
    } else if (def.typeName === 'ZodNumber') {
      return {
        type: 'number',
        description: def.description || undefined,
        minimum: def.checks?.find(c => c.kind === 'min')?.value,
        maximum: def.checks?.find(c => c.kind === 'max')?.value
      };
    } else if (def.typeName === 'ZodBoolean') {
      return {
        type: 'boolean',
        description: def.description || undefined
      };
    } else if (def.typeName === 'ZodArray') {
      return {
        type: 'array',
        items: this.convertZodField(def.type),
        description: def.description || undefined
      };
    } else if (def.typeName === 'ZodEnum') {
      return {
        type: 'string',
        enum: def.values,
        description: def.description || undefined
      };
    } else if (def.typeName === 'ZodObject') {
      return this.zodToJsonSchema(zodField);
    } else if (def.typeName === 'ZodOptional') {
      return this.convertZodField(def.innerType);
    } else {
      return {
        type: 'string',
        description: def.description || 'Complex field - see documentation'
      };
    }
  }

  createSchemaFromOperation(operation) {
    // Create JSON Schema from operation definition (for generated tools)
    const properties = {};
    const required = [];

    // Add path parameters
    if (operation.pathParams) {
      operation.pathParams.forEach(param => {
        properties[param.name] = {
          type: 'string',
          description: param.description || `Path parameter: ${param.name}`
        };
        required.push(param.name);
      });
    }

    // Add query parameters
    if (operation.queryParams) {
      operation.queryParams.forEach(param => {
        properties[param.name] = {
          type: param.type === 'integer' ? 'number' : 'string',
          description: param.description || `Query parameter: ${param.name}`
        };
        if (param.required) {
          required.push(param.name);
        }
      });
    }

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(operation.method.toUpperCase())) {
      properties.body = {
        type: 'object',
        description: 'Request body data'
      };
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
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
