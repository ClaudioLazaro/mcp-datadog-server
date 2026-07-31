import { log } from '../core/logger.js';

/**
 * Format a snake_case tool name to Title Case for display.
 */
export function formatToolName(name) {
  return name
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Create a standard MCP tool response.
 * Follows the MCP CallToolResult format:
 *   { content: [{ type: 'text', text: string }], isError?: boolean }
 */
export function createToolResponse(data, error = null, meta = {}) {
  if (error) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message || String(error),
          status: error.status || meta.status,
          details: error.response?.data || undefined,
        }, null, 2),
      }],
    };
  }

  const content = typeof data === 'string'
    ? data
    : JSON.stringify(data, null, 2);

  return {
    content: [{ type: 'text', text: content }],
  };
}

/**
 * Create a tool executor for schema-generated operations.
 * Handles path params, query params, body, and headers mapping.
 */
export function createCoreTool(operation, client) {
  return {
    name: operation.name,
    description: operation.description,
    category: operation.category,

    async execute(args = {}) {
      try {
        const { path: pathParams, query, body, headers, ...rest } = args;
        const mergedQuery = { ...query, ...rest };

        const resolvedQuery = {};
        for (const [key, value] of Object.entries(mergedQuery)) {
          const paramDef = operation.queryParams?.[key];
          const originalKey = paramDef?.originalKey || key;
          resolvedQuery[originalKey] = value;
        }

        const response = await client.request({
          method: operation.method,
          rawUrlTemplate: operation.rawUrlTemplate,
          pathParams,
          query: resolvedQuery,
          body,
          headers,
        });

        return createToolResponse(response.data, null, {
          status: response.status,
          url: response.url,
          method: response.method,
        });
      } catch (error) {
        log(`Error in tool ${operation.name}: ${error.message}`, 'error');
        return createToolResponse(null, error, {
          operation: operation.name,
          category: operation.category,
        });
      }
    },
  };
}
