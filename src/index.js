#!/usr/bin/env node
import 'dotenv/config';
import { createServer } from './server.js';
import { loadConfig, validateConfig } from './core/config.js';
import { parseSchema } from './core/schema-parser.js';
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
  console.error(`[mcp-datadog] ${message}`);
}

function parseOptions(args) {
  const options = {};
  for (const arg of args) {
    if (!arg.startsWith('--')) continue;
    const eqIdx = arg.indexOf('=');
    const keyRaw = eqIdx === -1 ? arg.slice(2) : arg.slice(2, eqIdx);
    const key = keyRaw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    let value = eqIdx === -1 ? true : arg.slice(eqIdx + 1);
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    options[key] = value;
  }
  return options;
}

async function listToolsCommand(config, options) {
  const server = await createServer(config);
  const detailed = options?.detailed || options?.verbose;
  const toolsInfo = server.getToolsInfo(detailed);

  if (options?.json) {
    console.log(JSON.stringify(toolsInfo, null, 2));
  } else {
    console.log(`Total tools: ${toolsInfo.total}`);
    console.log(`- Curated tools: ${toolsInfo.curated}`);
    console.log(`- CRUD tools: ${toolsInfo.crud || 0}`);
    console.log(`- Generated tools: ${toolsInfo.generated}`);
    console.log(`- Categories: ${toolsInfo.categories.join(', ')}`);

    if (detailed && toolsInfo.tools) {
      console.log('\n📋 Tools List (Ordered Alphabetically):\n');

      toolsInfo.tools.forEach((tool, index) => {
        const typeIcon = tool.type === 'curated' ? '🎯' : tool.type === 'crud' ? '⚡' : '🔧';
        const complexityIcon = {
          'simple': '🟢',
          'low': '🟡',
          'medium': '🟠',
          'high': '🔴'
        }[tool.complexity] || '🟠';

        console.log(`${String(index + 1).padStart(3)}. ${typeIcon} ${tool.name}`);
        console.log(`     Description: ${tool.description.slice(0, 80)}${tool.description.length > 80 ? '...' : ''}`);
        console.log(`     Category: ${tool.category} | Method: ${tool.method} | API: ${tool.api} | ${complexityIcon} ${tool.complexity}`);
        console.log(`     Operations: GET ${tool.operations.get} | UPDATE ${tool.operations.update} | DELETE ${tool.operations.delete}`);
        console.log('');
      });
    } else {
      console.log('\n💡 Use --detailed to see the ordered tools list with CRUD operations');
    }
  }
}


async function validateCommand(config, options) {
  const validation = validateConfig(config);

  const report = {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    schemaExists: validation.schemaExists,
  };

  if (options?.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('Configuration validation:');
    console.log(`- Valid: ${validation.valid ? 'Yes' : 'No'}`);
    if (validation.errors.length > 0) {
      console.log(`- Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`- Warnings: ${validation.warnings.join(', ')}`);
    }
    console.log(`- Schema exists: ${validation.schemaExists ? 'Yes' : 'No'}`);
  }

  if (!validation.valid) {
    process.exitCode = 1;
  }
}

async function analyzeSchemaCommand(config, options) {
  if (!fs.existsSync(config.schemaPath)) {
    console.error('Schema file not found');
    process.exitCode = 1;
    return;
  }

  const { operations, categories } = parseSchema(config.schemaPath, config.allowedFolders);

  const report = {
    schemaPath: config.schemaPath,
    totalCategories: categories.length,
    totalOperations: operations.length,
    categories,
    allowedFolders: config.allowedFolders,
  };

  if (options?.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Schema Analysis:`);
    console.log(`- Path: ${config.schemaPath}`);
    console.log(`- Categories: ${categories.length}`);
    console.log(`- Operations: ${operations.length}`);
    if (config.allowedFolders) {
      console.log(`- Filtered to: ${config.allowedFolders.join(', ')}`);
    }
    console.log(`- Available categories: ${categories.join(', ')}`);
  }
}

async function getToolCommand(config, options, toolName) {
  if (!toolName) {
    console.error('Tool name is required. Usage: mcp-datadog-server get-tool <tool-name>');
    process.exitCode = 1;
    return;
  }

  const server = await createServer(config);
  const toolInfo = server.getToolInfo(toolName);

  if (!toolInfo) {
    console.error(`Tool '${toolName}' not found.`);
    process.exitCode = 1;
    return;
  }

  if (options?.json) {
    console.log(JSON.stringify(toolInfo, null, 2));
  } else {
    const typeIcon = toolInfo.type === 'curated' ? '🎯' : toolInfo.type === 'crud' ? '⚡' : '🔧';
    const complexityIcon = {
      'simple': '🟢',
      'low': '🟡',
      'medium': '🟠',
      'high': '🔴'
    }[toolInfo.complexity] || '🟠';

    console.log(`${typeIcon} Tool: ${toolInfo.name}`);
    console.log(`Description: ${toolInfo.description}`);
    console.log(`Category: ${toolInfo.category}`);
    console.log(`Type: ${toolInfo.type}`);
    console.log(`Method: ${toolInfo.method}`);
    console.log(`API Version: ${toolInfo.api}`);
    console.log(`Complexity: ${complexityIcon} ${toolInfo.complexity}`);

    if (toolInfo.endpoint) {
      console.log(`Endpoint: ${toolInfo.endpoint}`);
    }

    if (toolInfo.type === 'crud') {
      console.log(`Resource: ${toolInfo.resource}`);
      console.log(`Operation: ${toolInfo.operation}`);
    }

    if (toolInfo.usage) {
      console.log('\nUsage Info:');
      console.log(`- Frequency: ${toolInfo.usage.frequency}`);
      console.log(`- Audience: ${toolInfo.usage.audience.join(', ')}`);
      if (toolInfo.usage.examples?.length > 0) {
        console.log('- Examples:');
        toolInfo.usage.examples.forEach(example => {
          console.log(`  ${example}`);
        });
      }
    }

    console.log('\nAvailable Operations:');
    console.log(`- GET: ${toolInfo.operations.get}`);
    console.log(`- UPDATE: ${toolInfo.operations.update}`);
    console.log(`- DELETE: ${toolInfo.operations.delete}`);
  }
}

async function updateToolCommand(config, options, toolName) {
  if (!toolName) {
    console.error('Tool name is required. Usage: mcp-datadog-server update-tool <tool-name>');
    process.exitCode = 1;
    return;
  }

  const server = await createServer(config);
  const toolInfo = server.getToolInfo(toolName);

  if (!toolInfo) {
    console.error(`Tool '${toolName}' not found.`);
    process.exitCode = 1;
    return;
  }

  if (toolInfo.type === 'generated') {
    console.log('⚠️  Generated tools cannot be updated directly.');
    console.log('   They are created from the Datadog API schema.');
    console.log('   To modify them, update the schema or create a curated version.');
    return;
  }

  console.log(`🔧 Updating curated tool: ${toolName}`);
  console.log('   This would typically involve:');
  console.log('   - Modifying the tool definition in curated-tools.js');
  console.log('   - Updating schema, description, or implementation');
  console.log('   - Restarting the server to apply changes');
  console.log('\n💡 For now, this is a placeholder for the update functionality.');
}

async function deleteToolCommand(config, options, toolName) {
  if (!toolName) {
    console.error('Tool name is required. Usage: mcp-datadog-server delete-tool <tool-name>');
    process.exitCode = 1;
    return;
  }

  const server = await createServer(config);
  const toolInfo = server.getToolInfo(toolName);

  if (!toolInfo) {
    console.error(`Tool '${toolName}' not found.`);
    process.exitCode = 1;
    return;
  }

  if (toolInfo.type === 'generated') {
    console.log('⚠️  Generated tools cannot be deleted directly.');
    console.log('   They are created from the Datadog API schema.');
    console.log('   To remove them, filter them out using --folders option.');
    return;
  }

  console.log(`🗑️  Deleting curated tool: ${toolName}`);
  console.log('   This would typically involve:');
  console.log('   - Removing the tool definition from curated-tools.js');
  console.log('   - Restarting the server to apply changes');
  console.log('\n💡 For now, this is a placeholder for the delete functionality.');
}

async function showSchemaCommand(config, options, toolName) {
  if (!toolName) {
    console.error('Tool name is required. Usage: mcp-datadog-server show-schema <tool-name>');
    process.exitCode = 1;
    return;
  }

  const server = await createServer(config);
  const schema = server.getToolSchema(toolName);

  if (!schema) {
    console.error(`Tool '${toolName}' not found.`);
    process.exitCode = 1;
    return;
  }

  if (options?.json) {
    console.log(JSON.stringify(schema, null, 2));
  } else {
    console.log(`📋 Schema for tool: ${toolName}\n`);

    console.log('📄 Input Schema (JSON Schema format):');
    console.log(JSON.stringify(schema.inputSchema, null, 2));

    if (schema.examples) {
      console.log('\n💡 Usage Examples:');
      schema.examples.forEach((example, index) => {
        console.log(`\n${index + 1}. ${example.description || 'Example'}:`);
        console.log(JSON.stringify(example.params, null, 2));
      });
    }

    if (schema.required && schema.required.length > 0) {
      console.log(`\n⚠️  Required fields: ${schema.required.join(', ')}`);
    }

    console.log('\n📝 How to use this tool:');
    console.log('   The LLM will automatically see this schema through MCP protocol.');
    console.log('   The schema defines all required and optional parameters.');
    console.log('   Each field includes descriptions to guide the LLM.');
  }
}

async function serve(config, options) {
  try {
    const server = await createServer({ ...config, ...options });
    await server.start();
  } catch (error) {
    log(`Failed to start server: ${error.message}`, 'error');
    process.exit(1);
  }
}


function showHelp() {
  console.log(`mcp-datadog-server v${getVersion()}`);
  console.log('Usage: mcp-datadog-server [command] [--options]\n');
  console.log('Commands:');
  console.log('  serve                Start the MCP server (default)');
  console.log('  list-tools           List available tools');
  console.log('  get-tool <name>      Get detailed information about a specific tool');
  console.log('  show-schema <name>   Show the input schema for a specific tool');
  console.log('  update-tool <name>   Update a specific tool (curated tools only)');
  console.log('  delete-tool <name>   Delete a specific tool (curated tools only)');
  console.log('  validate             Validate configuration');
  console.log('  analyze-schema       Analyze API schema');
  console.log('  version              Print package version');
  console.log('  help                 Show this message');
  console.log('\nCommon options:');
  console.log('  --folders=F1,F2      Filter to specific API categories');
  console.log('  --schema=PATH        Override schema file path');
  console.log('  --site=SITE          Override Datadog site');
  console.log('  --json               Output in JSON format');
  console.log('  --detailed           Show detailed tools list with CRUD operations');
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let command = 'serve';
  let commandArgs = [];
  let optionArgs = rawArgs;

  // Parse command and arguments
  if (rawArgs.length && !rawArgs[0].startsWith('--')) {
    command = rawArgs[0];
    const restArgs = rawArgs.slice(1);

    // Separate command arguments from options
    commandArgs = [];
    optionArgs = [];

    for (const arg of restArgs) {
      if (arg.startsWith('--')) {
        optionArgs.push(arg);
      } else {
        commandArgs.push(arg);
      }
    }
  }

  const options = parseOptions(optionArgs);
  const config = loadConfig();

  try {
    switch (command) {
      case 'serve':
      case 'stdio':
        await serve(config, options);
        break;

      case 'list-tools':
        await listToolsCommand(config, options);
        break;

      case 'get-tool':
        await getToolCommand(config, options, commandArgs[0]);
        break;

      case 'show-schema':
        await showSchemaCommand(config, options, commandArgs[0]);
        break;

      case 'update-tool':
        await updateToolCommand(config, options, commandArgs[0]);
        break;

      case 'delete-tool':
        await deleteToolCommand(config, options, commandArgs[0]);
        break;

      case 'validate':
        await validateCommand(config, options);
        break;

      case 'analyze-schema':
        await analyzeSchemaCommand(config, options);
        break;

      case 'version':
      case '--version':
      case '-v':
        console.log(getVersion());
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exitCode = 1;
    }
  } catch (error) {
    log(`Command failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});

export { createServer };
