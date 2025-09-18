#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { fileURLToPath } from "url";
import { loadPostmanCollection, buildToolsFromPostman } from "./schema.js";
import { datadogRequest } from "./http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSchemaPath() {
  const envPath = process.env.MCP_DD_SCHEMA_PATH;
  if (envPath && envPath.trim()) return envPath;
  // default to repo root co-located file name
  return path.resolve(__dirname, "../datadog-api-collection-schema.json");
}

function logOnce(msg) {
  if (!global.__MCP_LOGGED) global.__MCP_LOGGED = new Set();
  if (!global.__MCP_LOGGED.has(msg)) {
    // eslint-disable-next-line no-console
    console.error(`[mcp-datadog] ${msg}`);
    global.__MCP_LOGGED.add(msg);
  }
}

const server = new Server(
  {
    name: "mcp-datadog-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let toolIndex = { tools: [], operationsByName: new Map(), topLevelFolders: [] };

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const schemaPath = resolveSchemaPath();
    const postman = loadPostmanCollection(schemaPath);
    toolIndex = buildToolsFromPostman(postman);
    if (toolIndex.tools.length > 250) {
      logOnce(
        `Loaded ${toolIndex.tools.length} tools. Consider filtering with MCP_DD_FOLDERS to a smaller set.`
      );
    }
    return { tools: toolIndex.tools };
  } catch (err) {
    logOnce(`Error loading tools: ${err.message}`);
    return { tools: [] };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (!toolIndex.operationsByName || !toolIndex.operationsByName.size) {
    const schemaPath = resolveSchemaPath();
    const postman = loadPostmanCollection(schemaPath);
    toolIndex = buildToolsFromPostman(postman);
  }

  const op = toolIndex.operationsByName.get(name);
  if (!op) {
    return {
      is_error: true,
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  }

  try {
    const response = await datadogRequest({
      method: op.method,
      rawUrlTemplate: op.rawUrlTemplate,
      pathParams: args?.path || {},
      query: args?.query || {},
      body: args?.body,
      headers: args?.headers || {},
      site: args?.site,
      subdomain: args?.subdomain,
    });

    const pretty = typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2);
    const meta = { status: response.status, ok: response.ok, url: response.url, method: response.method };
    return {
      is_error: !response.ok,
      content: [
        { type: "text", text: JSON.stringify(meta) },
        { type: "text", text: pretty },
      ],
    };
  } catch (err) {
    return {
      is_error: true,
      content: [
        {
          type: "text",
          text: `Request failed: ${err.message}`,
        },
      ],
    };
  }
});

await server.connect(new StdioServerTransport());

