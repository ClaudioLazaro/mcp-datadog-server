/**
 * MCP-aware logging utility.
 * Uses MCP sendLoggingMessage when a server connection is available,
 * falls back to stderr for CLI and pre-connection usage.
 */

let _mcpServer = null;

const LOG_LEVELS = ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'];

export function setMcpServer(server) {
  _mcpServer = server;
}

export function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const data = typeof message === 'string' ? message : message;

  if (_mcpServer) {
    try {
      _mcpServer.sendLoggingMessage({
        level,
        logger: 'mcp-datadog-server',
        data,
      });
      return;
    } catch {
      // Fall through to stderr if MCP logging fails
    }
  }

  const levelUpper = level.toUpperCase();
  console.error(`[${timestamp}] [${levelUpper}] ${typeof data === 'string' ? data : JSON.stringify(data)}`);
}

export function debug(message) { log(message, 'debug'); }
export function info(message) { log(message, 'info'); }
export function warn(message) { log(message, 'warning'); }
export function error(message) { log(message, 'error'); }
export function critical(message) { log(message, 'critical'); }
