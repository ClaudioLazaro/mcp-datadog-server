#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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

// Create server instance aligned with MCP docs example
const server = new McpServer({
  name: "mcp-datadog-server",
  version: "0.1.6",
});

function registerTools() {
  try {
    const schemaPath = resolveSchemaPath();
    const postman = loadPostmanCollection(schemaPath);
    const toolIndex = buildToolsFromPostman(postman);

    if (toolIndex.tools.length > 250) {
      logOnce(
        `Loaded ${toolIndex.tools.length} tools. Consider filtering with MCP_DD_FOLDERS to a smaller set.`
      );
    }

    for (const op of toolIndex.operationsByName.values()) {
      const inputSchema = z.object({
        path: z.record(z.any()).optional().describe(
          op.pathVariables?.length ? `Path params: ${op.pathVariables.join(", ")}` : "Optional map of path params"
        ),
        query: z.record(z.any()).optional().describe("Optional querystring parameters"),
        body: z.any().optional().describe("Optional request body (object, array, or raw JSON string)"),
        headers: z.record(z.any()).optional().describe("Optional extra headers to include"),
        site: z.string().optional().describe("Datadog site (default from DD_SITE, e.g. datadoghq.com)"),
        subdomain: z.string().optional().describe("Subdomain for baseUrl (default 'api')"),
      });

      server.tool(
        op.name,
        op.description || `${op.method} ${op.rawUrlTemplate}`,
        inputSchema,
        async (args) => {
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
                { type: "text", text: `Request failed: ${err?.message || String(err)}` },
              ],
            };
          }
        }
      );
    }

    logOnce(`Registered ${toolIndex.tools.length} tools.`);
  } catch (err) {
    logOnce(`Error loading tools: ${err.message}`);
  }
}

registerTools();

await server.connect(new StdioServerTransport());
console.error("[mcp-datadog] Server running on stdio");
