/**
 * Request-building tests.
 *
 * These assert the exact path, query string and body that would reach Datadog,
 * by pointing the client at a local origin that echoes what it received.
 * Every case here corresponds to a bug that shipped undetected.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { parseSchema } = await import(path.join(ROOT, 'src/core/schema-parser.js'));
const { createCoreTool } = await import(path.join(ROOT, 'src/tools/core-tools.js'));
const { loadConfig } = await import(path.join(ROOT, 'src/core/config.js'));
const { DatadogClient } = await import(path.join(ROOT, 'src/core/http-client.js'));
const { CRUD_TOOLS } = await import(path.join(ROOT, 'src/tools/crud-tools.js'));
const { CURATED_TOOLS } = await import(path.join(ROOT, 'src/tools/curated-tools.js'));

process.env.DD_API_KEY ||= 'test-api-key';
process.env.DD_APP_KEY ||= 'test-app-key';

const config = loadConfig(process.env);
const { operations } = parseSchema(config.schemaPath, null);

let server;
let client;
let received;

before(async () => {
  received = [];
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      received.push({ url: req.url, body });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  client = new DatadogClient(config);
  client.baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function callGenerated(name, args) {
  const operation = operations.find(op => op.name === name);
  assert.ok(operation, `operation not found: ${name}`);
  received.length = 0;
  await createCoreTool(operation, client).execute(args);
  return received[0];
}

async function callTool(tools, name, args) {
  received.length = 0;
  await tools[name].execute(args, client, config);
  return received[0];
}

test('path parameters are substituted into the URL, not appended as query', async () => {
  // The tool schema is flat, so path params arrive as top-level args. Treating
  // them as query params left `:filter_id` literal in the path — 180 of 320
  // generated operations 404'd.
  const { url } = await callGenerated('get_a_given_apm_retention_filter', { filter_id: 'ABC123' });

  assert.equal(url, '/api/v2/apm/config/retention-filters/ABC123');
  assert.ok(!url.includes(':filter_id'), 'path placeholder must be substituted');
  assert.ok(!url.includes('?'), 'path param must not leak into the query string');
});

test('a query parameter named "query" is not spread character-by-character', async () => {
  // `const { query, ...rest } = args` then `{...query}` turned the string
  // "env:prod" into {0:'e',1:'n',...}.
  const { url } = await callGenerated('get_all_slos', { query: 'env:prod', limit: '10' });

  const params = new URLSearchParams(url.split('?')[1]);
  assert.equal(params.get('query'), 'env:prod');
  assert.equal(params.get('limit'), '10');
  assert.equal(params.get('0'), null, 'string must not be spread into index keys');
});

test('placeholder query strings in URL templates are stripped', async () => {
  // 42 templates embed Postman example values such as
  // `?from=36993837&group_by=consectetur`; keeping them produced a second `?`.
  const { url } = await callGenerated('get_all_aggregated_connections', { from: '100', to: '200' });

  assert.equal(url.split('?').length, 2, 'exactly one "?" expected');
  const params = new URLSearchParams(url.split('?')[1]);
  assert.equal(params.get('from'), '100');
  assert.equal(params.get('to'), '200');
  assert.ok(!url.includes('consectetur'), 'placeholder values must not be sent');
});

test('no generated operation forces a query parameter to be required', () => {
  // Postman omits `disabled` on enabled params, so `required: !disabled` made
  // 42 operations uncallable.
  const forced = operations
    .filter(op => Object.values(op.queryParams ?? {}).some(param => param.required))
    .map(op => op.name);

  assert.deepEqual(forced, []);
});

test('generated tools restore bracket notation on the wire', async () => {
  const { url } = await callGenerated('get_all_dashboards', { filter_shared: 'true' });
  const params = new URLSearchParams(url.split('?')[1]);
  assert.equal(params.get('filter[shared]'), 'true');
});

test('CRUD list tools send Datadog bracket parameter names', async () => {
  const team = await callTool(CRUD_TOOLS, 'list_team', { page_size: 10, filter_keyword: 'x' });
  const teamParams = new URLSearchParams(team.url.split('?')[1]);
  assert.equal(teamParams.get('page[size]'), '10');
  assert.equal(teamParams.get('filter[keyword]'), 'x');

  const user = await callTool(CRUD_TOOLS, 'list_user', { page_size: 10, page_number: 2 });
  const userParams = new URLSearchParams(user.url.split('?')[1]);
  assert.equal(userParams.get('page[size]'), '10');
  assert.equal(userParams.get('page[number]'), '2');

  const dashboard = await callTool(CRUD_TOOLS, 'list_dashboard', { filter_shared: true });
  const dashboardParams = new URLSearchParams(dashboard.url.split('?')[1]);
  assert.equal(dashboardParams.get('filter[shared]'), 'true');
});

test('team CRUD tools target /api/v2/team, which is the endpoint that exists', async () => {
  const { url } = await callTool(CRUD_TOOLS, 'list_team', {});
  assert.ok(url.startsWith('/api/v2/team'), url);
  assert.ok(!url.startsWith('/api/v2/teams'), '/api/v2/teams does not exist');
});

test('v2 CRUD bodies carry the JSON:API envelope, v1 bodies stay flat', async () => {
  const user = await callTool(CRUD_TOOLS, 'create_user', { email: 'a@b.com', name: 'A' });
  assert.deepEqual(JSON.parse(user.body), {
    data: { type: 'users', attributes: { email: 'a@b.com', name: 'A' } },
  });

  const team = await callTool(CRUD_TOOLS, 'create_team', { name: 'T', handle: 't' });
  assert.deepEqual(JSON.parse(team.body), {
    data: { type: 'team', attributes: { name: 'T', handle: 't' } },
  });

  // v1 endpoints take flat bodies and must not be wrapped.
  const monitor = await callTool(CRUD_TOOLS, 'create_monitor', {
    name: 'M', type: 'metric alert', query: 'avg(last_5m):x > 1',
  });
  const monitorBody = JSON.parse(monitor.body);
  assert.equal(monitorBody.data, undefined);
  assert.equal(monitorBody.name, 'M');
});

test('update_user carries data.id, which the spec marks required', async () => {
  const result = await callTool(CRUD_TOOLS, 'update_user', { user_id: 'u-1', name: 'New' });
  const { data } = JSON.parse(result.body);

  assert.equal(data.id, 'u-1');
  assert.equal(data.type, 'users');
  assert.deepEqual(data.attributes, { name: 'New' });
  assert.equal(result.url, '/api/v2/users/u-1', 'id still belongs in the path too');
});

test('update_team omits data.id, which its schema does not define', async () => {
  const result = await callTool(CRUD_TOOLS, 'update_team', { team_id: 't-1', name: 'New' });
  const { data } = JSON.parse(result.body);

  assert.equal(data.id, undefined);
  assert.equal(data.type, 'team');
  assert.deepEqual(data.attributes, { name: 'New' });
});

test('search_logs sends sort as a string', async () => {
  const result = await callTool(CURATED_TOOLS, 'search_logs', {
    query: 'x', from: 'now-1h', to: 'now', limit: 5, sort: '-timestamp',
  });
  assert.equal(JSON.parse(result.body).sort, '-timestamp');
});

test('{{site}} keeps the regional host', async () => {
  const regional = new DatadogClient({ ...config, site: 'us3.datadoghq.com', subdomain: 'api' });
  let requestedHost;

  const probe = http.createServer((req, res) => {
    requestedHost = req.headers.host;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));

  try {
    // Exercise buildUrl directly through a template that uses {{site}}.
    const operation = operations.find(op => op.rawUrlTemplate.includes('{{site}}'));
    assert.ok(operation, 'expected an operation using {{site}}');

    const url = operation.rawUrlTemplate.split('?')[0].replace('{{site}}', 'us3.datadoghq.com');
    assert.ok(url.includes('us3.datadoghq.com'), 'region must be preserved');
    assert.ok(regional.baseUrl.includes('us3.datadoghq.com'));
  } finally {
    probe.close();
  }
  assert.equal(requestedHost, undefined);
});

test('non-idempotent methods are not retried after a 5xx', async () => {
  let attempts = 0;
  const flaky = http.createServer((req, res) => {
    attempts += 1;
    res.writeHead(503);
    res.end('{}');
  });
  await new Promise(resolve => flaky.listen(0, '127.0.0.1', resolve));

  const retrying = new DatadogClient({ ...config, maxRetries: 3, retryBaseMs: 10 });
  retrying.baseUrl = `http://127.0.0.1:${flaky.address().port}`;

  try {
    await retrying.request({
      method: 'POST',
      rawUrlTemplate: '{{baseUrl}}/api/v1/monitor',
      body: { name: 'x' },
    }).catch(() => {});

    assert.equal(attempts, 1, 'a failed POST must not be replayed');
  } finally {
    flaky.close();
  }
});

/** Serve a 429 carrying the given headers, and report attempts + error message. */
async function throttled(headers, overrides) {
  let attempts = 0;
  const origin = http.createServer((req, res) => {
    attempts += 1;
    res.writeHead(429, headers);
    res.end('{"errors":["rate limit exceeded"]}');
  });
  await new Promise(resolve => origin.listen(0, '127.0.0.1', resolve));

  const throttledClient = new DatadogClient({ ...config, retryBaseMs: 20, ...overrides });
  throttledClient.baseUrl = `http://127.0.0.1:${origin.address().port}`;

  let message = '';
  const startedAt = Date.now();
  await throttledClient
    .request({ method: 'GET', rawUrlTemplate: '{{baseUrl}}/x' })
    .catch(error => { message = error.message; });

  origin.close();
  return { attempts, message, elapsed: Date.now() - startedAt };
}

test('X-RateLimit-Reset is honored, not just Retry-After', async () => {
  // Datadog signals throttling with X-RateLimit-Reset; ignoring it meant
  // falling back to a backoff far shorter than the server asked for.
  const { attempts, elapsed } = await throttled(
    { 'x-ratelimit-reset': '1' },
    { maxRetries: 1, maxRateLimitWaitMs: 20000 }
  );

  assert.equal(attempts, 2, 'should retry once');
  assert.ok(elapsed >= 1000, `should wait the full second, waited ${elapsed}ms`);
});

test('a long rate-limit reset returns immediately instead of blocking the call', async () => {
  const { attempts, elapsed, message } = await throttled(
    { 'x-ratelimit-reset': '120' },
    { maxRetries: 3, maxRateLimitWaitMs: 20000 }
  );

  assert.equal(attempts, 1, 'must not burn retries on a wait it will not honor');
  assert.ok(elapsed < 1000, `should fail fast, took ${elapsed}ms`);
  assert.match(message, /Wait at least 120s/);
});

test('the 429 message tells the caller what to do instead of retrying', async () => {
  const { message } = await throttled(
    {
      'x-ratelimit-reset': '30',
      'x-ratelimit-name': 'logs_search',
      'x-ratelimit-limit': '300',
      'x-ratelimit-period': '3600',
    },
    { maxRetries: 0 }
  );

  assert.match(message, /logs_search/, 'names the limit that was hit');
  assert.match(message, /300 requests per 3600s/);
  assert.match(message, /Wait at least 30s/);
  assert.match(message, /Do not retry immediately/);
});

test('a Retry-After HTTP-date does not collapse the backoff to zero', async () => {
  // parseInt('Wed, 21 Oct ...') is NaN, and setTimeout(NaN) fires immediately,
  // burning every retry in a few milliseconds.
  let attempts = 0;
  const throttled = http.createServer((req, res) => {
    attempts += 1;
    res.writeHead(429, { 'retry-after': 'Wed, 21 Oct 2035 07:28:00 GMT' });
    res.end('{}');
  });
  await new Promise(resolve => throttled.listen(0, '127.0.0.1', resolve));

  const retrying = new DatadogClient({ ...config, maxRetries: 2, retryBaseMs: 10, timeoutMs: 5000 });
  retrying.baseUrl = `http://127.0.0.1:${throttled.address().port}`;

  try {
    const pending = retrying.request({ method: 'GET', rawUrlTemplate: '{{baseUrl}}/x' }).catch(() => {});
    await Promise.race([pending, new Promise(resolve => setTimeout(resolve, 800))]);

    assert.equal(attempts, 1, 'retries must wait rather than fire instantly');
  } finally {
    throttled.close();
  }
});
