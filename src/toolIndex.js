import {
  generatedOperations,
  generatedTopLevelFolders,
  generatedTools,
} from "./generatedTools.js";

function resolveAllowedFolders(config, override) {
  if (override !== undefined) return Array.isArray(override) ? override : null;
  return Array.isArray(config.allowedFolders) ? config.allowedFolders : null;
}

export function buildToolIndex(config, { allowedFoldersOverride } = {}) {
  const allowedFolders = resolveAllowedFolders(config, allowedFoldersOverride);
  const useFilter = Array.isArray(allowedFolders) && allowedFolders.length > 0;
  const allowedSet = useFilter ? new Set(allowedFolders) : null;

  const operations = useFilter
    ? generatedOperations.filter((op) => allowedSet.has(op.category))
    : generatedOperations;

  const operationsByName = new Map(operations.map((op) => [op.name, op]));

  const tools = generatedTools.filter((tool) => operationsByName.has(tool.name));

  return {
    tools,
    operationsByName,
    topLevelFolders: generatedTopLevelFolders,
  };
}
