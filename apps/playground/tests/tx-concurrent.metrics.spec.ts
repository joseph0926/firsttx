import { test } from '@playwright/test';

/**
 * Placeholder for Concurrent Updates measurement tests.
 *
 * Planned steps:
 *  1. Visit /tx/concurrent and configure deterministic failure rate
 *  2. Launch transactions and wait for completion
 *  3. Read the hidden metrics element (`data-testid="concurrent-metrics"`)
 *  4. Persist success rate / avg duration via tests/utils/metrics.ts
 */
test.describe.skip('Concurrent updates metrics (TODO)', () => {
  test('collects transaction stats', async () => {
    // Implementation coming soon.
  });
});
