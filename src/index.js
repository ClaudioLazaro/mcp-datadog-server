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

function log(message) {
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
  const server = await createServer(options);
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
      console.log('\nTools List (Ordered Alphabetically):\n');

      toolsInfo.tools.forEach((tool, index) => {
        console.log(`${String(index + 1).padStart(3)}. [${tool.type}] ${tool.name}`);
        console.log(`     ${tool.description.slice(0, 80)}${tool.description.length > 80 ? '...' : ''}`);
        console.log(`     Category: ${tool.category}`);
        console.log('');
      });
    } else {
      console.log('\nUse --detailed to see the full tools list');
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
    console.log('Schema Analysis:');
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

  const server = await createServer(options);
  const toolInfo = server.getToolInfo(toolName);

  if (!toolInfo) {
    console.error(`Tool '${toolName}' not found.`);
    process.exitCode = 1;
    return;
  }

  if (options?.json) {
    console.log(JSON.stringify(toolInfo, null, 2));
  } else {
    console.log(`Tool: ${toolInfo.name}`);
    console.log(`Description: ${toolInfo.description}`);
    console.log(`Category: ${toolInfo.category}`);
    console.log(`Type: ${toolInfo.type}`);
  }
}

async function serve(config, options) {
  try {
    const server = await createServer(options);
    await server.start();
  } catch (error) {
    log(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`mcp-datadog-server v${getVersion()}`);
  console.log('Usage: mcp-datadog-server [command] [--options]\n');
  console.log('Commands:');
  console.log('  serve                Start the MCP server (default)');
  console.log('  list-tools           List available tools');
  console.log('  get-tool <name>      Get information about a specific tool');
  console.log('  validate             Validate configuration');
  console.log('  analyze-schema       Analyze API schema');
  console.log('  version              Print package version');
  console.log('  help                 Show this message');
  console.log('\nOptions:');
  console.log('  --folders=F1,F2      Filter to specific API categories');
  console.log('  --schema=PATH        Override schema file path');
  console.log('  --site=SITE          Override Datadog site');
  console.log('  --json               Output in JSON format');
  console.log('  --detailed           Show detailed tools list');
}

const HELP_FLAGS = new Set(['help', '--help', '-h']);
const VERSION_FLAGS = new Set(['version', '--version', '-v']);

async function main() {
  const rawArgs = process.argv.slice(2);

  // Handle help/version before command parsing: flags starting with `--` are
  // never treated as a command below, so they must be intercepted here.
  if (rawArgs.some(arg => HELP_FLAGS.has(arg))) {
    showHelp();
    return;
  }

  if (rawArgs.some(arg => VERSION_FLAGS.has(arg))) {
    console.log(getVersion());
    return;
  }

  let command = 'serve';
  let commandArgs = [];
  let optionArgs = rawArgs;

  if (rawArgs.length && !rawArgs[0].startsWith('--')) {
    command = rawArgs[0];
    const restArgs = rawArgs.slice(1);

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

  // Apply CLI overrides so the commands that inspect config directly
  // (validate, analyze-schema) see the same view createServer builds.
  const schemaOverride = options.schema || options.schemaPath;
  if (schemaOverride) {
    config.schemaPath = path.resolve(process.cwd(), schemaOverride);
  }
  if (options.folders) {
    config.allowedFolders = String(options.folders)
      .split(',')
      .map(folder => folder.trim())
      .filter(Boolean);
  }
  if (options.site) {
    config.site = options.site;
  }

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

      case 'validate':
        await validateCommand(config, options);
        break;

      case 'analyze-schema':
        await analyzeSchemaCommand(config, options);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exitCode = 1;
    }
  } catch (error) {
    log(`Command failed: ${error.message}`);
    process.exit(1);
  }
}

function isRunDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

// Only run the CLI when executed as a script. This file is also the package
// entry point, so importing it must not start a server as a side effect.
if (isRunDirectly()) {
  main().catch((error) => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { createServer };
