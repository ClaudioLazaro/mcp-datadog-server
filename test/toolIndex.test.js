import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildToolIndex } from '../src/toolIndex.js';
import { loadConfig } from '../src/config.js';
import { projectRoot } from '../src/paths.js';

const config = loadConfig({
  MCP_DD_SCHEMA_PATH: path.join(projectRoot, 'datadog-api-collection-schema.json'),
});

test('buildToolIndex returns operations grouped by name', () => {
  const index = buildToolIndex(config, { allowedFoldersOverride: ['Monitors'] });
  assert.ok(index.tools.length > 0);
  for (const tool of index.tools) {
    assert.ok(tool.name.length > 0);
  }
  assert.ok(index.operationsByName.size >= index.tools.length);
  assert.ok(index.operationsByName.has('get_monitor'));
  assert.ok(index.operationsByName.has('update_monitor'));
});
