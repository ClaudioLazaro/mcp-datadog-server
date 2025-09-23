import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const DEFAULT_SCHEMA_PATH = path.join(projectRoot, 'datadog-api-collection-schema.json');

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const str = String(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

function parseFolders(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const filtered = value.map(v => String(v).trim()).filter(Boolean);
    return filtered.length ? filtered : null;
  }
  const str = String(value).trim();
  if (!str || str === '*' || str.toLowerCase() === 'all') return null;
  const folders = str.split(',').map(v => v.trim()).filter(Boolean);
  return folders.length ? folders : null;
}

function getCredentials(env) {
  return {
    apiKey: env.DD_API_KEY || env.DATADOG_API_KEY || env.DD_CLIENT_API_KEY,
    appKey: env.DD_APP_KEY || env.DATADOG_APP_KEY || env.DD_APPLICATION_KEY || env.DD_CLIENT_APP_KEY,
  };
}

export function loadConfig(env = process.env) {
  const schemaPath = env.MCP_DD_SCHEMA_PATH || DEFAULT_SCHEMA_PATH;
  const allowedFolders = parseFolders(env.MCP_DD_FOLDERS);
  const site = env.DD_SITE || env.DATADOG_SITE || 'datadoghq.com';
  const subdomain = env.DD_SUBDOMAIN || 'api';
  const maxRetries = parseNumber(env.MCP_DD_MAX_RETRIES, 3);
  const retryBaseMs = parseNumber(env.MCP_DD_RETRY_BASE_MS, 1000);
  const respectRetryAfter = !parseBoolean(env.MCP_DD_IGNORE_RETRY_AFTER, false);
  const userAgent = env.MCP_DD_USER_AGENT || 'mcp-datadog-server';
  const timeoutMs = parseNumber(env.MCP_DD_TIMEOUT_MS, 30000);
  const credentials = getCredentials(env);

  return {
    schemaPath,
    allowedFolders,
    site,
    subdomain,
    maxRetries,
    retryBaseMs,
    respectRetryAfter,
    userAgent,
    timeoutMs,
    credentials,
  };
}

export function validateConfig(config) {
  const errors = [];
  const warnings = [];
  
  if (!config.credentials.apiKey) {
    errors.push('DD_API_KEY is required');
  }
  
  if (!config.credentials.appKey) {
    errors.push('DD_APP_KEY is required');
  }
  
  const schemaExists = fs.existsSync(config.schemaPath);
  if (!schemaExists) {
    warnings.push(`Schema file not found at ${config.schemaPath}`);
  }
  
  if (config.maxRetries < 0 || config.maxRetries > 10) {
    warnings.push('maxRetries should be between 0 and 10');
  }
  
  if (config.timeoutMs < 1000 || config.timeoutMs > 300000) {
    warnings.push('timeoutMs should be between 1000 and 300000 (5 minutes)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaExists,
  };
}

function redactSecret(secret) {
  if (!secret) return '(not set)';
  if (secret.length <= 6) return '***';
  return `${secret.slice(0, 3)}***${secret.slice(-3)}`;
}

export function summarizeConfig(config) {
  return {
    schemaPath: config.schemaPath,
    allowedFolders: config.allowedFolders || '(all)',
    site: config.site,
    subdomain: config.subdomain,
    maxRetries: config.maxRetries,
    retryBaseMs: config.retryBaseMs,
    respectRetryAfter: config.respectRetryAfter,
    userAgent: config.userAgent,
    timeoutMs: config.timeoutMs,
    credentials: {
      apiKey: redactSecret(config.credentials.apiKey),
      appKey: redactSecret(config.credentials.appKey),
    },
  };
}
