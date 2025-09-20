import { loadPostmanCollection, buildToolsFromPostman } from "./schema.js";

export function buildToolIndex(config, { allowedFoldersOverride } = {}) {
  const collection = loadPostmanCollection(config.schemaPath);
  const allowedFolders =
    allowedFoldersOverride !== undefined
      ? allowedFoldersOverride
      : config.allowedFolders;
  return buildToolsFromPostman(collection, {
    allowedFolders,
  });
}
