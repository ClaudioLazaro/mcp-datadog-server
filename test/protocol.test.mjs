/**
 * MCP protocol conformance tests.
 *
 * These run the real server over an in-memory MCP transport and assert the
 * wire-level output is valid. They are hermetic: no Datadog network calls are
 * made (tool execution is exercised against a stub client).
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { createServer } = await import(path.join(ROOT, 'src/server.js'));
const { parseSchema } = await import(path.join(ROOT, 'src/core/schema-parser.js'));
const { createCoreTool } = await import(path.join(ROOT, 'src/tools/core-tools.js'));
const { loadConfig } = await import(path.join(ROOT, 'src/core/config.js'));

// Anthropic/MCP constraints for tool input schema property keys and tool names.
const PROPERTY_KEY_RE = /^[a-zA-Z0-9_.-]{1,64}$/;
const TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

let server;
let client;
let tools;

before(async () => {
  process.env.DD_API_KEY ||= 'test-api-key';
  process.env.DD_APP_KEY ||= 'test-app-key';

  server = await createServer();

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'protocol-test', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([
    server.server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  ({ tools } = await client.listTools());
});

after(async () => {
  await client?.close();
});

/** Recursively collect property keys that violate the MCP/Anthropic pattern. */
function invalidPropertyKeys(schema, prefix = '') {
  const bad = [];
  if (!schema || typeof schema !== 'object') return bad;

  if (schema.properties && typeof schema.properties === 'object') {
    for (const [key, value] of Object.entries(schema.properties)) {
      if (!PROPERTY_KEY_RE.test(key)) bad.push(`${prefix}${key}`);
      bad.push(...invalidPropertyKeys(value, `${prefix}${key}.`));
    }
  }
  if (schema.items) bad.push(...invalidPropertyKeys(schema.items, `${prefix}[].`));
  for (const keyword of ['anyOf', 'oneOf', 'allOf']) {
    if (Array.isArray(schema[keyword])) {
      for (const sub of schema[keyword]) bad.push(...invalidPropertyKeys(sub, prefix));
    }
  }
  return bad;
}

test('server exposes tools over the MCP protocol', () => {
  assert.ok(tools.length > 0, 'expected at least one tool');
});

test('every tool input schema property key is API-safe', () => {
  // Regression guard: Datadog query params like `page[size]` and
  // `filter[query]` contain brackets and are rejected by the Anthropic API.
  const violations = tools
    .map(t => ({ name: t.name, bad: invalidPropertyKeys(t.inputSchema) }))
    .filter(t => t.bad.length > 0)
    .map(t => `${t.name}: ${t.bad.join(', ')}`);

  assert.deepEqual(violations, [], `tools with invalid property keys:\n${violations.join('\n')}`);
});

test('every tool name is API-safe and unique', () => {
  const badNames = tools.filter(t => !TOOL_NAME_RE.test(t.name)).map(t => t.name);
  assert.deepEqual(badNames, [], 'tool names must match ^[a-zA-Z0-9_-]{1,64}$');

  const names = tools.map(t => t.name);
  const duplicates = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  assert.deepEqual(duplicates, [], 'tool names must be unique');
});

test('every tool has a description and an object input schema', () => {
  const missingDescription = tools.filter(t => !t.description?.trim()).map(t => t.name);
  assert.deepEqual(missingDescription, []);

  const badSchema = tools.filter(t => t.inputSchema?.type !== 'object').map(t => t.name);
  assert.deepEqual(badSchema, []);
});

test('initialize() is idempotent', async () => {
  const before = server.tools.size;
  await server.initialize();
  assert.equal(server.tools.size, before, 're-initializing must not re-register tools');
});

test('server declares tools, resources, prompts and logging capabilities', () => {
  const capabilities = client.getServerCapabilities();
  for (const capability of ['tools', 'resources', 'prompts', 'logging']) {
    assert.ok(capabilities?.[capability], `missing capability: ${capability}`);
  }
});

test('resources list and read correctly', async () => {
  const { resources } = await client.listResources();
  assert.ok(resources.length > 0);

  for (const resource of resources) {
    assert.doesNotThrow(() => new URL(resource.uri), `invalid URI: ${resource.uri}`);
  }

  const { resourceTemplates } = await client.listResourceTemplates();
  assert.ok(resourceTemplates.length > 0);
});

test('every prompt renders a well-formed message list', async () => {
  const { prompts } = await client.listPrompts();
  assert.ok(prompts.length > 0);

  const registered = server.server._registeredPrompts ?? {};

  const unwrap = zodType => {
    const name = zodType?._def?.typeName;
    return name === 'ZodOptional' || name === 'ZodDefault' || name === 'ZodNullable'
      ? unwrap(zodType._def.innerType)
      : zodType;
  };

  for (const prompt of prompts) {
    const shape = registered[prompt.name]?.argsSchema?.shape ?? {};
    const args = {};
    for (const arg of prompt.arguments ?? []) {
      const zodType = unwrap(shape[arg.name]);
      // Enum-constrained args need a real option, not a placeholder.
      args[arg.name] = zodType?._def?.typeName === 'ZodEnum'
        ? zodType._def.values[0]
        : 'test-value';
    }

    const result = await client.getPrompt({ name: prompt.name, arguments: args });
    assert.ok(Array.isArray(result.messages) && result.messages.length > 0, prompt.name);
    for (const message of result.messages) {
      assert.ok(message.role, `${prompt.name}: message missing role`);
      assert.equal(message.content?.type, 'text', `${prompt.name}: content must be text`);
      assert.equal(typeof message.content.text, 'string');
    }
  }
});

test('sanitized query keys are restored to their original form on the wire', async () => {
  // `filter_shared` is what the model sees; `filter[shared]` is what Datadog needs.
  const config = loadConfig(process.env);
  const { operations } = parseSchema(config.schemaPath, config.allowedFolders);
  const operation = operations.find(op => op.name === 'get_all_dashboards');
  assert.ok(operation, 'expected get_all_dashboards in the schema');

  let captured;
  const stubClient = {
    async request(args) {
      captured = args;
      return { data: {}, status: 200, url: '', method: 'GET' };
    },
  };

  await createCoreTool(operation, stubClient).execute({
    filter_shared: 'true',
    filter_deleted: 'false',
  });

  assert.equal(captured.query['filter[shared]'], 'true');
  assert.equal(captured.query['filter[deleted]'], 'false');
});

test('query key sanitization is lossless and collision-free', () => {
  const config = loadConfig(process.env);
  const { operations } = parseSchema(config.schemaPath, config.allowedFolders);

  const problems = [];
  for (const operation of operations) {
    const queryParams = operation.queryParams ?? {};
    const originals = new Set(
      Object.entries(queryParams).map(([key, def]) => def.originalKey || key)
    );

    if (originals.size !== Object.keys(queryParams).length) {
      problems.push(`${operation.name}: ${originals.size} original keys collapsed into ${Object.keys(queryParams).length}`);
    }
    for (const key of Object.keys(queryParams)) {
      if (!key) problems.push(`${operation.name}: produced an empty key`);
    }
  }

  assert.deepEqual(problems, []);
});

test('tool errors are returned as spec-compliant results, not thrown', async () => {
  const config = loadConfig(process.env);
  const { operations } = parseSchema(config.schemaPath, config.allowedFolders);
  const operation = operations.find(op => op.method === 'GET');

  const failingClient = {
    async request() {
      const error = new Error('HTTP 401: Unauthorized');
      error.status = 401;
      throw error;
    },
  };

  const result = await createCoreTool(operation, failingClient).execute({});

  assert.equal(result.isError, true);
  assert.ok(Array.isArray(result.content));
  for (const item of result.content) {
    assert.equal(item.type, 'text');
    assert.equal(typeof item.text, 'string');
  }
});

test('logger never writes to stdout', async () => {
  // stdout carries the JSON-RPC stream; any stray write corrupts the session.
  const logger = await import(path.join(ROOT, 'src/core/logger.js'));

  const captured = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = function (chunk, ...rest) {
    captured.push(String(chunk));
    return originalWrite.call(process.stdout, chunk, ...rest);
  };

  try {
    logger.info('probe');
    logger.warn('probe');
    logger.error('probe');
    logger.debug('probe');
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.deepEqual(captured, [], 'logger must write to stderr only');
});

test('importing the package entry point does not start a server', async () => {
  const entry = await import(path.join(ROOT, 'src/index.js'));
  assert.equal(typeof entry.createServer, 'function');
});
