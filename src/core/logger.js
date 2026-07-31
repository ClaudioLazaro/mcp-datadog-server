/**
 * MCP-aware logging utility.
 * Uses MCP sendLoggingMessage when a server connection is available,
 * falls back to stderr for CLI and pre-connection usage.
 */

let _mcpServer = null;

// MCP spec levels (RFC 5424). An out-of-enum level would be rejected by strict
// clients, so unknown values are coerced to 'info'.
const LOG_LEVELS = new Set([
  'debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency',
]);

export function setMcpServer(server) {
  _mcpServer = server;
}

function writeStderr(data, level) {
  const timestamp = new Date().toISOString();
  // stderr only — stdout carries the JSON-RPC stream on the stdio transport.
  console.error(
    `[${timestamp}] [${level.toUpperCase()}] ${typeof data === 'string' ? data : JSON.stringify(data)}`
  );
}

export function log(message, level = 'info') {
  const data = message;
  const safeLevel = LOG_LEVELS.has(level) ? level : 'info';

  if (_mcpServer) {
    try {
      const sent = _mcpServer.sendLoggingMessage({
        level: safeLevel,
        logger: 'mcp-datadog-server',
        data,
      });

      // sendLoggingMessage is async; a rejected transport write must still
      // surface somewhere rather than being swallowed.
      if (sent && typeof sent.catch === 'function') {
        sent.catch(() => writeStderr(data, safeLevel));
      }
      return;
    } catch {
      // Fall through to stderr if MCP logging throws synchronously.
    }
  }

  writeStderr(data, safeLevel);
}

export function debug(message) { log(message, 'debug'); }
export function info(message) { log(message, 'info'); }
export function warn(message) { log(message, 'warning'); }
export function error(message) { log(message, 'error'); }
export function critical(message) { log(message, 'critical'); }
