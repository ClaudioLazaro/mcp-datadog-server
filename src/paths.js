import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, "..");

export function defaultSchemaPath() {
  return path.resolve(projectRoot, "datadog-api-collection-schema.json");
}

export function resolveSchemaPath(env = process.env) {
  const envPath = env.MCP_DD_SCHEMA_PATH;
  if (envPath && envPath.trim()) return path.resolve(projectRoot, envPath.trim());
  return defaultSchemaPath();
}
