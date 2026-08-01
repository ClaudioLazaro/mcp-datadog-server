/**
 * Response-shaping tests.
 *
 * Tool results are read by a model with a finite context. Returning a raw
 * Datadog page (~85KB for 50 log events) forces the caller to spill it to disk
 * and post-process it, so these tests pin the digest shape and its size.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CURATED_TOOLS } = await import(path.join(ROOT, 'src/tools/curated-tools.js'));

/** A page of log events shaped like the real v2 response, with heavy nesting. */
function logsPage(count = 50) {
  const services = ['acerto-integracao-apis-api', 'acerto-multi-credor-api', 'compute.googleapis.com'];
  const messages = ['External Http request', 'An unhandled exception has occurred.', 'API do credor indisponível.'];

  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `AwAAAZ-5kt8kVSz-WwAAABhBWi01a3VTMUFBRE9JQk9wVFNoYzZRQUEAAAAk-${i}`,
      type: 'log',
      attributes: {
        timestamp: '2026-07-31T19:07:18.180Z',
        status: i % 10 === 0 ? 'warn' : 'error',
        service: services[i % services.length],
        host: `gke-prod-node-pool-${i % 8}`,
        message: messages[i % messages.length],
        tags: Array.from({ length: 10 }, (_, t) => `tag_${t}:value_${t}_${i}`),
        attributes: {
          http: { method: 'POST', status_code: 500, url: `https://api.internal/v1/resource/${i}` },
          error: { kind: 'HttpRequestException', stack: 'at Service.Call(...)\n'.repeat(20) },
          trace_id: '1234567890123456789',
        },
      },
    })),
    links: { next: 'https://api.us3.datadoghq.com/api/v2/logs/events?page[cursor]=eyJ' },
    meta: { page: { after: 'CURSOR-ABC' }, elapsed: 132, status: 'done' },
  };
}

function stubClient(payload) {
  return {
    calls: [],
    async request(args) {
      this.calls.push(args);
      return { data: payload, status: 200, url: '', method: 'POST' };
    },
  };
}

async function searchLogs(args, payload = logsPage()) {
  const client = stubClient(payload);
  const result = await CURATED_TOOLS.search_logs.execute(
    { query: '*', from: 'now-15m', to: 'now', limit: 50, sort: '-timestamp', ...args },
    client,
    { site: 'us3.datadoghq.com' }
  );
  return { result, text: result.content[0].text, parsed: JSON.parse(result.content[0].text), client };
}

test('search_logs returns a digest, not the raw page', async () => {
  const { parsed } = await searchLogs({});

  assert.equal(parsed.summary.returned, 50);
  assert.equal(Object.keys(parsed.logs[0]).sort().join(','), 'host,message,service,status,timestamp');
  assert.equal(parsed.logs[0].tags, undefined, 'tags must not be echoed back');
  assert.equal(parsed.logs[0].attributes, undefined, 'nested attributes must not be echoed back');
});

test('the digest pre-computes the aggregates a caller would otherwise script', async () => {
  const { parsed } = await searchLogs({});

  // These three counts are exactly what the model was computing with python3.
  assert.equal(parsed.summary.by_status.error, 45);
  assert.equal(parsed.summary.by_status.warn, 5);
  assert.equal(Object.values(parsed.summary.by_service).reduce((a, b) => a + b, 0), 50);
  assert.equal(Object.values(parsed.summary.by_message).reduce((a, b) => a + b, 0), 50);
});

test('the digest is dramatically smaller than the raw page', async () => {
  const payload = logsPage();
  const { text } = await searchLogs({}, payload);
  const rawSize = JSON.stringify(payload, null, 2).length;

  assert.ok(text.length < rawSize * 0.25,
    `digest ${text.length} should be well under 25% of raw ${rawSize}`);
});

test('include_attributes returns the untouched payload', async () => {
  const payload = logsPage(3);
  const { parsed } = await searchLogs({ include_attributes: true }, payload);

  assert.deepEqual(parsed, payload, 'escape hatch must lose nothing');
});

test('pagination cursor is exposed and accepted', async () => {
  const { parsed } = await searchLogs({});
  assert.equal(parsed.next_cursor, 'CURSOR-ABC');

  const { client } = await searchLogs({ cursor: 'CURSOR-ABC' });
  assert.equal(client.calls[0].body.page.cursor, 'CURSOR-ABC');
});

test('long messages are truncated so one log cannot dominate the result', async () => {
  const payload = logsPage(1);
  payload.data[0].attributes.message = 'x'.repeat(5000);

  const { parsed } = await searchLogs({}, payload);
  assert.ok(parsed.logs[0].message.length < 400, 'message must be capped');
  assert.ok(parsed.logs[0].message.endsWith('…'), 'truncation must be visible');
});

test('high-cardinality dimensions are capped rather than echoed in full', async () => {
  const payload = logsPage(60);
  payload.data.forEach((event, i) => { event.attributes.service = `service-${i}`; });

  const { parsed } = await searchLogs({}, payload);
  const keys = Object.keys(parsed.summary.by_service);

  assert.ok(keys.length <= 16, `expected a capped map, got ${keys.length} keys`);
  assert.ok(keys.includes('(other)'), 'the remainder must still be accounted for');

  const total = Object.values(parsed.summary.by_service).reduce((a, b) => a + b, 0);
  assert.equal(total, 60, 'capping must not lose events');
});

test('an empty result set does not throw', async () => {
  const { parsed } = await searchLogs({}, { data: [], meta: {} });

  assert.equal(parsed.summary.returned, 0);
  assert.deepEqual(parsed.logs, []);
});
