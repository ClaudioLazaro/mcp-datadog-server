import fs from 'node:fs';
import { buildToolsFromPostman } from '../src/schema.js';
import { generatedOperations } from '../src/generatedTools.js';

try {
  const raw = fs.readFileSync('datadog-api-collection-schema.json', 'utf8');
  const json = JSON.parse(raw);
  if (!json || typeof json !== 'object' || !json.info || !json.item) {
    console.error('Invalid Postman collection: missing info/item.');
    process.exit(2);
  }
  // Basic sanity checks
  if (!Array.isArray(json.item) || json.item.length === 0) {
    console.error('Postman collection has no items.');
    process.exit(3);
  }
  console.log('Postman collection looks valid. Items:', json.item.length);

  const { operationsByName } = buildToolsFromPostman(json, { allowedFolders: null });
  if (operationsByName.size !== generatedOperations.length) {
    console.error(
      `generatedTools.js is out of sync. Expected ${operationsByName.size} operations, found ${generatedOperations.length}. Run node scripts/generate-tools.js.`
    );
    process.exit(4);
  }
} catch (err) {
  console.error('Failed to validate generated tools:', err.message);
  process.exit(1);
}
