import fs from "fs";
import { resolveSchemaPath } from "./paths.js";

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function parseFolders(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const arr = value.map((v) => String(v).trim()).filter(Boolean);
    return arr.length ? arr : [];
  }
  const str = String(value).trim();
  if (!str) return [];
  if (str === "*" || str.toLowerCase() === "all") return [];
  const arr = str
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return arr.length ? arr : [];
}

export function loadConfig(env = process.env) {
  const schemaPath = resolveSchemaPath(env);
  const envFoldersRaw = env.MCP_DD_FOLDERS ?? env.MCP_DD_FOLDER_ALLOWLIST;
  const allowedFolders = parseFolders(envFoldersRaw);
  const site = env.DD_SITE || env.DATADOG_SITE || "datadoghq.com";
  const subdomain = env.DD_SUBDOMAIN || "api";
  const maxRetries = parseNumber(env.MCP_DD_MAX_RETRIES, 2);
  const retryBaseMs = parseNumber(env.MCP_DD_RETRY_BASE_MS, 500);
  const respectRetryAfter = env.MCP_DD_RESPECT_RETRY_AFTER === "false" ? false : true;
  const userAgent = env.MCP_DD_USER_AGENT || "mcp-datadog-server";

  return {
    schemaPath,
    allowedFolders,
    site,
    subdomain,
    maxRetries,
    retryBaseMs,
    respectRetryAfter,
    userAgent,
    credentials: {
      apiKey:
        env.DD_API_KEY || env.DATADOG_API_KEY || env.DD_CLIENT_API_KEY || env.DD_API_TOKEN,
      appKey:
        env.DD_APP_KEY ||
        env.DATADOG_APP_KEY ||
        env.DD_APPLICATION_KEY ||
        env.DD_CLIENT_APP_KEY,
    },
  };
}

export function validateConfig(config) {
  const missing = [];
  if (!config.credentials.apiKey) missing.push("DD_API_KEY");
  if (!config.credentials.appKey) missing.push("DD_APP_KEY");

  const schemaExists = fs.existsSync(config.schemaPath);

  return {
    ok: missing.length === 0,
    schemaExists,
    missing,
  };
}

export function redactSecret(secret) {
  if (!secret) return "(unset)";
  if (secret.length <= 6) return "***";
  return `${secret.slice(0, 3)}***${secret.slice(-2)}`;
}

export function summarizeConfig(config) {
  return {
    schemaPath: config.schemaPath,
    allowedFolders:
      config.allowedFolders && config.allowedFolders.length
        ? config.allowedFolders
        : "(all)",
    site: config.site,
    subdomain: config.subdomain,
    maxRetries: config.maxRetries,
    retryBaseMs: config.retryBaseMs,
    respectRetryAfter: config.respectRetryAfter,
    userAgent: config.userAgent,
    credentials: {
      apiKey: redactSecret(config.credentials.apiKey),
      appKey: redactSecret(config.credentials.appKey),
    },
  };
}
