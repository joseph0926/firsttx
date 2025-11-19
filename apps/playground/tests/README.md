# Metrics Test Roadmap

This folder hosts Playwright-based measurements used to populate Playground metrics.  
The initial focus is on three flagship scenarios.

## Implemented

- **prepaint-heavy.spec.ts**
  - Measures hydration completion time (via `performance.now()`), DOMContentLoaded, and `first-contentful-paint` for cold vs warm visits.
  - Stores results in `.metrics/prepaint-heavy.latest.json` for later consumption inside the Playground UI.

## Upcoming

- **Sync / Instant Cart**
  1. Load both “Traditional CSR” and “FirstTx” panels.
  2. Trigger `+1` actions on each side while capturing latency via `performance.mark` injected through `page.evaluate`.
  3. Read the cart totals rendered in the DOM to ensure the optimistic update path succeeded.
  4. Persist metrics such as `traditionalActionLatency`, `firstTxActionLatency`, and `timeSavedPerInteraction`.

- **Tx / Concurrent Updates**
  1. Start the scenario, set deterministic `failureRate`, and trigger `Launch Concurrent`.
  2. Wait for the transaction log list to finish populating, then parse each row (status + duration).
  3. Count successes vs rollbacks to compute `transactionSuccessRate`, `averageRollbackTime`, and `consistencyPass` booleans.
  4. Dump results to `.metrics/tx-concurrent.latest.json`.

- **Additional candidates**
  - Staleness detection (TTL expiry timings) and Timing Attack (race condition protection) will piggyback on the same helper once the two primary sync/tx tests are stable.

All future tests should use the shared helper in `tests/utils/metrics.ts` to guarantee a consistent JSON schema.
