import { loadConfig } from '../src/config.js';
import { runSmokeTests } from '../src/smoke.js';

(async () => {
  try {
    const config = loadConfig(process.env);
    const result = await runSmokeTests(config);
    for (const test of result.results) {
      if (test.ok) {
        console.log(`✅ ${test.name}`, test.data);
      } else {
        console.error(`❌ ${test.name}`, test.error);
      }
    }
    if (!result.ok) {
      console.error('\nSome smoke tests failed');
      process.exit(1);
    }
    console.log('\nAll smoke tests passed! ✅');
  } catch (err) {
    console.error('Smoke test suite failed:', err?.message || err);
    process.exit(1);
  }
})();
