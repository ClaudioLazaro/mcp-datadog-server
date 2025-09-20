import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationInputSchema } from '../src/operationSchema.js';

test('operation input schema preserves additional top-level keys', () => {
  const schema = createOperationInputSchema({ pathVariables: ['foo_id'] });
  const parsed = schema.parse({
    query: { existing: true },
    some_extra_flag: 'yes',
    another: 42,
  });

  assert.deepEqual(parsed.query, { existing: true });
  assert.equal(parsed.some_extra_flag, 'yes');
  assert.equal(parsed.another, 42);
});
