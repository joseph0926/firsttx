import { test } from '@playwright/test';

/**
 * Placeholder for Instant Cart measurement tests.
 *
 * Once the DOM exposes the `data-testid="instant-cart-metrics"` hook,
 * this spec will:
 *  1. Load /sync/instant-cart
 *  2. Trigger both traditional and FirstTx increments
 *  3. Read the data attributes to confirm latency improvements
 *  4. Write metrics via tests/utils/metrics.ts
 */
test.describe.skip('Instant Cart metrics (TODO)', () => {
  test('collects latency comparisons', async () => {
    // Implementation coming soon.
  });
});
