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
        // The tool schema is flat: path and query params are top-level keys.
        // Route each arg by consulting the operation definition rather than
        // destructuring reserved names — several Datadog operations have a
        // query param literally called "query".
        const pathParams = {};
        const query = {};
        let body;
        let headers;

        for (const [key, value] of Object.entries(args)) {
          if (operation.pathParams?.[key]) {
            pathParams[key] = value;
            continue;
          }

          const queryParam = operation.queryParams?.[key];
          if (queryParam) {
            // Restore bracket notation (page_size -> page[size]) for the wire.
            query[queryParam.originalKey || key] = value;
            continue;
          }

          if (key === 'body') {
            body = value;
            continue;
          }

          if (key === 'headers') {
            headers = value;
            continue;
          }

          query[key] = value;
        }

        const response = await client.request({
          method: operation.method,
          rawUrlTemplate: operation.rawUrlTemplate,
          pathParams,
          query,
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
