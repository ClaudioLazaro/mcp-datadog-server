import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadConfig, parseFolders, summarizeConfig, validateConfig } from '../src/config.js';
import { projectRoot, defaultSchemaPath } from '../src/paths.js';

const schemaPath = defaultSchemaPath();

test('parseFolders handles null, empty, and wildcard', () => {
  assert.equal(parseFolders(null), null);
  assert.deepEqual(parseFolders(''), []);
  assert.deepEqual(parseFolders('*'), []);
  assert.deepEqual(parseFolders('Logs, Monitors'), ['Logs', 'Monitors']);
  assert.deepEqual(parseFolders(['Logs', 'Monitors']), ['Logs', 'Monitors']);
});

test('loadConfig reads env values with fallbacks', () => {
  const env = {
    MCP_DD_FOLDERS: 'Logs,Monitors',
    DD_SITE: 'datadoghq.eu',
    DD_SUBDOMAIN: 'api',
    MCP_DD_MAX_RETRIES: '5',
    MCP_DD_RETRY_BASE_MS: '750',
    MCP_DD_RESPECT_RETRY_AFTER: 'false',
    MCP_DD_USER_AGENT: 'custom-agent',
    DD_API_KEY: 'abc123',
    DD_APP_KEY: 'def456',
  };
  const config = loadConfig(env);
  assert.equal(config.site, 'datadoghq.eu');
  assert.equal(config.subdomain, 'api');
  assert.equal(config.maxRetries, 5);
  assert.equal(config.retryBaseMs, 750);
  assert.equal(config.respectRetryAfter, false);
  assert.equal(config.userAgent, 'custom-agent');
  assert.deepEqual(config.allowedFolders, ['Logs', 'Monitors']);
  assert.equal(config.credentials.apiKey, 'abc123');
  assert.equal(config.credentials.appKey, 'def456');
});

test('summarizeConfig redacts secrets and reports defaults', () => {
  const config = loadConfig({
    MCP_DD_SCHEMA_PATH: path.relative(projectRoot, schemaPath),
    DD_API_KEY: 'abc123456',
    DD_APP_KEY: 'xyz987654',
  });
  const summary = summarizeConfig(config);
  assert.equal(summary.credentials.apiKey.endsWith('56'), true);
  assert.equal(summary.credentials.appKey.startsWith('xyz'), true);
  assert.equal(summary.allowedFolders, '(all)');
});

test('validateConfig detects missing schema or credentials', () => {
  const config = loadConfig({ MCP_DD_SCHEMA_PATH: 'non-existent.json' });
  const report = validateConfig(config);
  assert.equal(report.schemaExists, false);
  assert.ok(report.missing.includes('DD_API_KEY'));
  assert.ok(report.missing.includes('DD_APP_KEY'));
});
