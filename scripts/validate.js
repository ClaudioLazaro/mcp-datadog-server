import fs from 'node:fs';

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
} catch (err) {
  console.error('Failed to parse datadog-api-collection-schema.json:', err.message);
  process.exit(1);
}

