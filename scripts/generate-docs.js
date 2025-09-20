import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadPostmanCollection, buildToolsFromPostman } from '../src/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Generating TOOLS.md...');

try {
  const schemaPath = path.resolve(__dirname, '../datadog-api-collection-schema.json');
  const postman = loadPostmanCollection(schemaPath);
  const toolIndex = buildToolsFromPostman(postman, { allowedFolders: process.env.MCP_DD_FOLDERS });

  const docs = toolIndex.tools.map(t => {
    const schema = t.input_schema || {};
    const props = schema.properties || {};
    const params = Object.keys(props).map(p => `* 
${p}
: 
${props[p].description || 'No description'}`).join('\n');

    return `### 
${t.name}
\n\n${t.description || 'No description.'}\n\n**Parameters:**\n${params || 'None.'}\n`;
  }).join('\n---\n');

  const outputPath = path.resolve(__dirname, '../TOOLS.md');
  fs.writeFileSync(outputPath, `# Datadog Tools\n\nThis file is auto-generated. Do not edit manually.\n\n${docs}`);

  console.log(`✅ Successfully generated TOOLS.md with ${toolIndex.tools.length} tools.`);
} catch (err) {
  console.error('❌ Failed to generate TOOLS.md:', err);
  process.exit(1);
}
