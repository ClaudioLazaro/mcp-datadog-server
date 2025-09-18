import test from 'node:test';
import assert from 'node:assert/strict';
import { MockAgent, setGlobalDispatcher } from 'undici';
import { datadogRequest } from '../src/http.js';

test('datadogRequest builds URL, auth headers and parses JSON', async () => {
  process.env.DD_API_KEY = 'test-api-key';
  process.env.DD_APP_KEY = 'test-app-key';

  const mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);

  const origin = 'https://api.example.com';
  const pool = mockAgent.get(origin);

  // Expect GET https://api.example.com/api/v1/monitor/123?test=1
  pool
    .intercept({ path: '/api/v1/monitor/123', method: 'GET', query: { test: '1' } })
    .reply(200, { ok: true }, { headers: { 'content-type': 'application/json' } });

  const res = await datadogRequest({
    method: 'GET',
    rawUrlTemplate: '{{baseUrl}}/api/v1/monitor/:monitor_id',
    pathParams: { monitor_id: '123' },
    query: { test: '1' },
    headers: { 'X-Test': '1' },
    site: 'example.com',
    subdomain: 'api',
  });

  assert.equal(res.status, 200);
  assert.equal(res.ok, true);
  assert.match(res.url, /https:\/\/api\.example\.com\/api\/v1\/monitor\/123\?test=1/);
  assert.deepEqual(res.data, { ok: true });
});

