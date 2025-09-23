import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, validateConfig, summarizeConfig } from '../src/core/config.js';
import { validateApiKey, validateAppKey, validateSite } from '../src/core/validation.js';
import { DatadogClient } from '../src/core/http-client.js';
import { parseSchema } from '../src/core/schema-parser.js';

test('validateApiKey validates API key format', () => {
  assert.strictEqual(validateApiKey('').valid, false);
  assert.strictEqual(validateApiKey('invalid').valid, false);
  assert.strictEqual(validateApiKey('a'.repeat(32)).valid, true);
  assert.strictEqual(validateApiKey('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').valid, true);
});

test('validateAppKey validates app key format', () => {
  assert.strictEqual(validateAppKey('').valid, false);
  assert.strictEqual(validateAppKey('invalid').valid, false);
  assert.strictEqual(validateAppKey('a'.repeat(40)).valid, true);
  assert.strictEqual(validateAppKey('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').valid, true);
});

test('validateSite validates Datadog sites', () => {
  assert.strictEqual(validateSite('datadoghq.com').valid, true);
  assert.strictEqual(validateSite('datadoghq.eu').valid, true);
  assert.strictEqual(validateSite('us3.datadoghq.com').valid, true);
  assert.strictEqual(validateSite('invalid.com').valid, false);
});

test('loadConfig reads env values with fallbacks', () => {
  const env = {
    MCP_DD_FOLDERS: 'Logs,Monitors',
    DD_SITE: 'us3.datadoghq.com',
    DD_SUBDOMAIN: 'api',
    MCP_DD_MAX_RETRIES: '5',
    MCP_DD_RETRY_BASE_MS: '750',
    MCP_DD_IGNORE_RETRY_AFTER: 'true',
    MCP_DD_USER_AGENT: 'custom-agent',
    DD_API_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    DD_APP_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  };
  const config = loadConfig(env);
  assert.equal(config.site, 'us3.datadoghq.com');
  assert.equal(config.subdomain, 'api');
  assert.equal(config.maxRetries, 5);
  assert.equal(config.retryBaseMs, 750);
  assert.equal(config.respectRetryAfter, false);
  assert.equal(config.userAgent, 'custom-agent');
  assert.deepEqual(config.allowedFolders, ['Logs', 'Monitors']);
  assert.equal(config.credentials.apiKey, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  assert.equal(config.credentials.appKey, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
});

test('summarizeConfig redacts secrets', () => {
  const config = loadConfig({
    DD_API_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    DD_APP_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  });
  const summary = summarizeConfig(config);
  assert.ok(summary.credentials.apiKey.includes('***'));
  assert.ok(summary.credentials.appKey.includes('***'));
  assert.equal(summary.allowedFolders, '(all)');
});

test('validateConfig detects missing credentials', () => {
  const config = loadConfig({
    MCP_DD_SCHEMA_PATH: 'non-existent.json',
    DD_API_KEY: '',
    DD_APP_KEY: '',
  });
  const report = validateConfig(config);
  assert.equal(report.schemaExists, false);
  assert.ok(report.errors.includes('DD_API_KEY is required'));
  assert.ok(report.errors.includes('DD_APP_KEY is required'));
});

test('DatadogClient can be instantiated', () => {
  const config = {
    site: 'us3.datadoghq.com',
    subdomain: 'api',
    maxRetries: 3,
    retryBaseMs: 1000,
    respectRetryAfter: true,
    userAgent: 'test-agent',
    timeoutMs: 30000,
    credentials: {
      apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      appKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  };
  const client = new DatadogClient(config);
  assert.ok(client);
  assert.equal(client.config.site, 'us3.datadoghq.com');
});

test('parseSchema handles missing file gracefully', () => {
  const result = parseSchema('non-existent-file.json');
  assert.equal(result.operations.length, 0);
  assert.equal(result.categories.length, 0);
});
