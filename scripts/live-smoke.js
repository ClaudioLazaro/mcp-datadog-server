import { datadogRequest } from '../src/http.js';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  // Ensure credentials exist
  const api = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const app = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY || process.env.DD_APPLICATION_KEY;
  if (!api || !app) {
    requireEnv('DD_API_KEY (or DATADOG_API_KEY)');
    requireEnv('DD_APP_KEY (or DATADOG_APP_KEY / DD_APPLICATION_KEY)');
  }

  console.log('Smoke test: Validate API key');
  const validate = await datadogRequest({
    method: 'GET',
    rawUrlTemplate: '{{baseUrl}}/api/v1/validate',
  });
  console.log('Validate:', validate.status, validate.ok, validate.data);

  // Optional quick read to demonstrate another call
  try {
    console.log('\nSmoke test: List monitors (page_size=1)');
    const monitors = await datadogRequest({
      method: 'GET',
      rawUrlTemplate: '{{baseUrl}}/api/v1/monitor',
      query: { page_size: 1 },
    });
    console.log('Monitors:', monitors.status, monitors.ok);
    console.log(typeof monitors.data === 'string' ? monitors.data : JSON.stringify(monitors.data, null, 2));
  } catch (e) {
    console.warn('Monitors call failed (this can be expected if permissions are limited):', e.message);
  }
}

main().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exit(1);
});

