#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import path from "path";
import { createOperationInputSchema } from "./operationSchema.js";
import { datadogRequest } from "./http.js";
import { registerCustomTools } from "./customTools.js";
import { loadConfig, validateConfig, summarizeConfig, parseFolders } from "./config.js";
import { buildToolIndex } from "./toolIndex.js";
import { projectRoot } from "./paths.js";
import { runSmokeTests } from "./smoke.js";

function logOnce(msg) {
  if (!global.__MCP_LOGGED) global.__MCP_LOGGED = new Set();
  if (!global.__MCP_LOGGED.has(msg)) {
    console.error(`[mcp-datadog] ${msg}`);
    global.__MCP_LOGGED.add(msg);
  }
}

function getPkgVersion() {
  try {
    const raw = fs.readFileSync(path.join(projectRoot, "package.json"), "utf8");
    const pkg = JSON.parse(raw);
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function mergeQueryParams(query, rest) {
  const merged = { ...(query || {}) };
  for (const [key, value] of Object.entries(rest || {})) {
    if (value === undefined) continue;
    merged[key] = value;
  }
  return merged;
}

function buildRequestDefaults(config) {
  return {
    site: config.site,
    subdomain: config.subdomain,
    maxRetries: config.maxRetries,
    retryBaseMs: config.retryBaseMs,
    respectRetryAfter: config.respectRetryAfter,
    userAgent: config.userAgent,
  };
}

function registerTools(server, config) {
  const toolIndex = buildToolIndex(config);

  if (toolIndex.tools.length > 250) {
    logOnce(
      `Loaded ${toolIndex.tools.length} tools. Consider filtering with MCP_DD_FOLDERS or --folders to reduce the set.`
    );
  }
  if (toolIndex.tools.length === 0) {
    const topLevel = toolIndex.topLevelFolders.join(", ");
    logOnce(
      `No tools loaded from schema. Top-level folders available: ${topLevel}. Adjust MCP_DD_FOLDERS or --folders to include the folders you need.`
    );
  }

  const defaults = buildRequestDefaults(config);

  for (const op of toolIndex.operationsByName.values()) {
    const inputSchema = createOperationInputSchema(op);

    server.tool(
      op.name,
      op.description || `${op.method} ${op.rawUrlTemplate}`,
      inputSchema,
      async (args) => {
        try {
          const {
            path: pathParams,
            query,
            body,
            headers,
            site,
            subdomain,
            timeoutMs,
            maxRetries,
            retryBaseMs,
            respectRetryAfter,
            userAgent,
            ...rest
          } = args || {};

          const queryParams = mergeQueryParams(query, rest);
          const response = await datadogRequest({
            ...defaults,
            method: op.method,
            rawUrlTemplate: op.rawUrlTemplate,
            pathParams: pathParams || {},
            query: queryParams,
            body,
            headers: headers || {},
            site: site ?? defaults.site,
            subdomain: subdomain ?? defaults.subdomain,
            timeoutMs,
            maxRetries: maxRetries ?? defaults.maxRetries,
            retryBaseMs: retryBaseMs ?? defaults.retryBaseMs,
            respectRetryAfter: respectRetryAfter ?? defaults.respectRetryAfter,
            userAgent: userAgent ?? defaults.userAgent,
          });

          const pretty =
            typeof response.data === "string"
              ? response.data
              : JSON.stringify(response.data, null, 2);
          const meta = {
            status: response.status,
            ok: response.ok,
            url: response.url,
            method: response.method,
          };
          return {
            content: [
              { type: "text", text: JSON.stringify(meta) },
              { type: "text", text: pretty },
            ],
            is_error: !response.ok,
          };
        } catch (err) {
          return {
            is_error: true,
            content: [
              {
                type: "text",
                text: `Request failed: ${err?.message || String(err)}`,
              },
            ],
          };
        }
      }
    );
  }

  logOnce(`Registered ${toolIndex.tools.length} tools.`);
  return toolIndex;
}

function parseOptions(args) {
  const options = {};
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const eqIdx = arg.indexOf("=");
    const keyRaw = eqIdx === -1 ? arg.slice(2) : arg.slice(2, eqIdx);
    const key = keyRaw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    let value = eqIdx === -1 ? true : arg.slice(eqIdx + 1);
    if (value === "true") value = true;
    else if (value === "false") value = false;
    options[key] = value;
  }
  return options;
}

function applyOptionOverrides(config, options) {
  if (!options || Object.keys(options).length === 0) return config;
  const next = { ...config };
  if (options.schema) next.schemaPath = path.resolve(process.cwd(), options.schema);
  if (options.site) next.site = options.site;
  if (options.subdomain) next.subdomain = options.subdomain;
  if (options.userAgent) next.userAgent = options.userAgent;
  if (options.maxRetries !== undefined) next.maxRetries = Number(options.maxRetries);
  if (options.retryBaseMs !== undefined) next.retryBaseMs = Number(options.retryBaseMs);
  if (options.respectRetryAfter === false) next.respectRetryAfter = false;
  if (options.folders !== undefined) {
    next.allowedFolders = parseFolders(options.folders);
  }
  return next;
}

function printConfigSummary(config) {
  const summary = summarizeConfig(config);
  console.error(`[mcp-datadog] Active configuration: ${JSON.stringify(summary)}`);
}

async function serve(config, options) {
  const runtimeConfig = applyOptionOverrides(config, options);
  const validation = validateConfig(runtimeConfig);
  if (!validation.schemaExists) {
    throw new Error(`Schema file not found at ${runtimeConfig.schemaPath}`);
  }
  if (validation.missing.length) {
    logOnce(
      `Missing credentials: ${validation.missing.join(", ")}. Calls will fail until they are provided.`
    );
  }

  printConfigSummary(runtimeConfig);

  const server = new McpServer({
    name: "mcp-datadog-server",
    version: getPkgVersion(),
  });

  registerTools(server, runtimeConfig);

  await server.connect(new StdioServerTransport());
  console.error("[mcp-datadog] Server running on stdio");

  try {
    registerCustomTools(server, buildRequestDefaults(runtimeConfig));
    logOnce(
      "Registered curated tools: list_dashboards, get_dashboard, list_monitors"
    );
  } catch (e) {
    logOnce(`Failed to register curated tools: ${e?.message || e}`);
  }
}

function stringifyOutput(obj) {
  return JSON.stringify(obj, null, 2);
}

async function listToolsCommand(config, options) {
  const runtimeConfig = applyOptionOverrides(config, options);
  const toolIndex = buildToolIndex(runtimeConfig);
  if (toolIndex.tools.length === 0) {
    console.error(
      "[mcp-datadog] No tools matched the provided filters. Check --folders or the schema path."
    );
  }
  if (options?.json) {
    console.log(
      stringifyOutput({
        total: toolIndex.tools.length,
        tools: toolIndex.tools.map((t) => ({
          name: t.name,
          description: t.description,
        })),
      })
    );
  } else {
    console.log(`Total tools: ${toolIndex.tools.length}`);
    for (const tool of toolIndex.tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }
  }
}

async function documentToolsCommand(config, options) {
  const runtimeConfig = applyOptionOverrides(config, options);
  const toolIndex = buildToolIndex(runtimeConfig);
  if (toolIndex.tools.length === 0) {
    console.error(
      "[mcp-datadog] No tools matched the provided filters. Check --folders or the schema path."
    );
  }
  const outputPath = path.resolve(process.cwd(), options?.output || "TOOLS.md");
  const docs = toolIndex.tools
    .map(
      (tool) =>
        `### ${tool.name}\n\n${tool.description}\n\n**Input Schema:**\n\n\`\`\`json\n${JSON.stringify(tool.input_schema, null, 2)}\n\`\`\`\n`
    )
    .join("\n");
  fs.writeFileSync(outputPath, docs);
  console.log(
    `[mcp-datadog] Wrote documentation for ${toolIndex.tools.length} tools to ${outputPath}`
  );
}

async function smokeTestCommand(config, options) {
  const runtimeConfig = applyOptionOverrides(config, options);
  const validation = validateConfig(runtimeConfig);
  if (validation.missing.length) {
    throw new Error(
      `Cannot run smoke tests without credentials: missing ${validation.missing.join(", ")}`
    );
  }
  const result = await runSmokeTests(runtimeConfig);
  if (options?.json) {
    console.log(stringifyOutput(result));
  } else {
    for (const test of result.results) {
      if (test.ok) {
        console.log(`✅ ${test.name}`);
      } else {
        console.error(`❌ ${test.name}: ${test.error}`);
      }
    }
    console.log(result.ok ? "All smoke tests passed." : "Some smoke tests failed.");
  }
  if (!result.ok) process.exitCode = 1;
}

async function doctorCommand(config, options) {
  const runtimeConfig = applyOptionOverrides(config, options);
  const validation = validateConfig(runtimeConfig);
  const report = {
    schemaPath: runtimeConfig.schemaPath,
    schemaExists: validation.schemaExists,
    missingCredentials: validation.missing,
  };

  if (options?.live) {
    try {
      const smoke = await runSmokeTests(runtimeConfig);
      report.smoke = smoke;
      report.ok = validation.schemaExists && validation.missing.length === 0 && smoke.ok;
    } catch (err) {
      report.smoke = { ok: false, error: err?.message || String(err) };
      report.ok = false;
    }
  } else {
    report.ok = validation.schemaExists && validation.missing.length === 0;
  }

  if (options?.json) {
    console.log(stringifyOutput(report));
  } else {
    console.log(`[mcp-datadog] Doctor report:`);
    console.log(`- Schema: ${report.schemaExists ? "found" : "missing"} (${report.schemaPath})`);
    console.log(
      `- Credentials: ${report.missingCredentials.length ? `missing ${report.missingCredentials.join(", ")}` : "present"}`
    );
    if (report.smoke) {
      console.log(`- Smoke tests: ${report.smoke.ok ? "passed" : "failed"}`);
    }
    console.log(`- Overall: ${report.ok ? "OK" : "Needs attention"}`);
  }

  if (!report.ok) process.exitCode = 1;
}

function showHelp() {
  console.log(`mcp-datadog-server v${getPkgVersion()}`);
  console.log("Usage: mcp-datadog-server [command] [--options]\n");
  console.log("Commands:");
  console.log("  serve                Start the MCP server (default)");
  console.log("  list-tools           Print generated tools");
  console.log("  document-tools       Write tool documentation to TOOLS.md");
  console.log("  smoke-test           Run live smoke tests against Datadog");
  console.log("  doctor               Validate configuration (use --live for API check)");
  console.log("  version              Print package version");
  console.log("  help                 Show this message");
  console.log("\nCommon options:");
  console.log("  --folders=F1,F2      Filter schema folders at runtime");
  console.log("  --schema=PATH        Override Postman schema path");
  console.log("  --site=SITE          Override Datadog site (e.g. datadoghq.com)");
  console.log("  --subdomain=SUB      Override subdomain (default api)");
  console.log("  --json               Emit JSON output (list-tools, smoke-test, doctor)");
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let command = "serve";
  let optionArgs = rawArgs;
  if (rawArgs.length && !rawArgs[0].startsWith("--")) {
    command = rawArgs[0];
    optionArgs = rawArgs.slice(1);
  }

  const options = parseOptions(optionArgs);
  const config = loadConfig();

  switch (command) {
    case "serve":
    case "stdio":
      await serve(config, options);
      break;
    case "list-tools":
      await listToolsCommand(config, options);
      break;
    case "document-tools":
      await documentToolsCommand(config, options);
      break;
    case "smoke-test":
      await smokeTestCommand(config, options);
      break;
    case "doctor":
      await doctorCommand(config, options);
      break;
    case "version":
    case "--version":
    case "-v":
      console.log(getPkgVersion());
      break;
    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;
    default:
      console.error(`[mcp-datadog] Unknown command: ${command}`);
      showHelp();
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`[mcp-datadog] Fatal error: ${err?.message || err}`);
  process.exit(1);
});
