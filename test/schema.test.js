import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPostmanCollection, buildToolsFromPostman } from '../src/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

test('buildToolsFromPostman generates friendly tool names', () => {
  const collection = loadPostmanCollection(path.join(root, 'datadog-api-collection-schema.json'));
  const { tools } = buildToolsFromPostman(collection, { allowedFolders: 'Monitors,Logs,Metrics' });
  const names = new Set(tools.map((t) => t.name));

  // Monitors
  assert.ok(names.has('get_monitors'), 'should include get_monitors');
  assert.ok(names.has('get_monitor'), 'should include get_monitor');
  assert.ok(names.has('create_monitor'), 'should include create_monitor');
  assert.ok(names.has('mute_monitor') && names.has('unmute_monitor'), 'should include mute/unmute');

  // Logs
  assert.ok(names.has('send_logs'), 'should include send_logs');
  assert.ok(names.has('search_logs_events'), 'should include search_logs_events');

  // Metrics
  assert.ok(names.has('query_timeseries'), 'should include query_timeseries');
  assert.ok(names.has('submit_series'), 'should include submit_series');
  assert.ok(names.has('submit_distribution_points'), 'should include submit_distribution_points');
  assert.ok(names.has('get_metrics_v1') && names.has('get_metrics_v2'), 'should disambiguate v1/v2');

  const getMonitorsTool = tools.find((t) => t.name === 'get_monitors');
  assert.ok(getMonitorsTool, 'get_monitors tool should be present');
  assert.equal(
    getMonitorsTool.input_schema?.additionalProperties,
    true,
    'tool schema should allow additional top-level properties'
  );
});
