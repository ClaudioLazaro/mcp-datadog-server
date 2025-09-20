import { datadogRequest } from '../src/http.js';

    async function test(name, fn) {
      console.log(`\n--- Testing: ${name} ---`);
      try {
        const result = await fn();
        console.log(`✅ PASS: ${name}`, result);
        return true;
      } catch (e) {
        console.error(`❌ FAIL: ${name}`, e);
        return false;
      }
    }

    async function main() {
      const api = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
      const app = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
      if (!api || !app) {
        throw new Error('Missing DD_API_KEY or DD_APP_KEY');
      }

      let allPassed = true;

      allPassed &= await test('Validate API key', async () => {
        const res = await datadogRequest({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/validate',
        });
        if (!res.ok || !res.data.valid) throw new Error(`Validation failed: ${JSON.stringify(res.data)}`);
        return { status: res.status, valid: res.data.valid };
      });

      allPassed &= await test('List Monitors (limit 1)', async () => {
        const res = await datadogRequest({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/monitor',
          query: { page_size: 1 },
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return { status: res.status, count: res.data?.length };
      });

      allPassed &= await test('List Events (last 10m)', async () => {
        const res = await datadogRequest({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/events',
          query: {
            start: Math.floor(Date.now() / 1000) - 600,
            end: Math.floor(Date.now() / 1000),
            priority: 'normal',
            page_size: 1,
          },
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status} ${JSON.stringify(res.data)}`);
        return { status: res.status, eventCount: res.data?.events?.length };
      });

      if (!allPassed) {
        console.error('\nSome smoke tests failed!');
        process.exit(1);
      } else {
        console.log('\nAll smoke tests passed! ✅');
      }
    }

    main().catch((e) => {
      console.error('\nSmoke test suite failed:', e);
      process.exit(1);
    });