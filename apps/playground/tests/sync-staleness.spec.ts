import { expect, test } from '@playwright/test';
import { createSyncStalenessArtifact, writeMetrics } from './utils/metrics';

const baseTime = Date.parse('2026-07-22T08:00:00.000Z');
const contractTestTitle = 'publishes deterministic stale and never-mount contract results';

test.describe('Sync Staleness Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((initialTime) => {
      Math.random = () => 0.5;
      const storedTime = window.localStorage.getItem('playground-test-now');
      const currentTime = storedTime ? Number(storedTime) : initialTime;
      Date.now = () => currentTime;
    }, baseTime);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.title !== contractTestTitle || testInfo.status === testInfo.expectedStatus) {
      return;
    }

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const dpr = page.isClosed()
      ? 1
      : await page.evaluate(() => window.devicePixelRatio).catch(() => 1);
    const artifact = await createSyncStalenessArtifact(
      {
        staleMount: {
          fetchCount: 0,
          isStale: true,
        },
        neverMount: {
          automaticFetchCount: 0,
          manualFetchCount: 0,
          isStale: true,
        },
      },
      {
        browser: testInfo.project.name,
        viewport,
        dpr,
      },
    );
    await writeMetrics(artifact);
  });

  test(contractTestTitle, async ({ page }, testInfo) => {
    const state = page.getByTestId('staleness-contract-state');
    await page.goto('/sync/staleness');
    await expect(state).toHaveAttribute('data-auto-fetch-count', '1', { timeout: 10_000 });
    await expect(state).toHaveAttribute('data-auto-is-stale', 'false');
    await expect(state).toHaveAttribute('data-manual-fetch-count', '0');

    const manualZone = page.getByRole('heading', { name: /Manual-Sync Zone/ }).locator('..');
    const refreshButton = manualZone.getByRole('button', { name: 'Refresh' });
    await refreshButton.click();
    await expect(state).toHaveAttribute('data-manual-fetch-count', '1');
    await expect(state).toHaveAttribute('data-manual-is-stale', 'false', { timeout: 10_000 });

    await page.evaluate((nextTime) => {
      window.localStorage.setItem('playground-test-now', String(nextTime));
    }, baseTime + 31_000);
    await page.reload();

    await expect(state).toHaveAttribute('data-auto-fetch-count', '1', { timeout: 10_000 });
    await expect(state).toHaveAttribute('data-auto-is-stale', 'false');
    await expect(state).toHaveAttribute('data-manual-fetch-count', '0');
    await expect(state).toHaveAttribute('data-manual-is-stale', 'true');

    const automaticFetchCount = Number(await state.getAttribute('data-manual-fetch-count'));
    const reloadedManualZone = page
      .getByRole('heading', { name: /Manual-Sync Zone/ })
      .locator('..');
    await reloadedManualZone.getByRole('button', { name: 'Refresh' }).click();
    await expect(state).toHaveAttribute('data-manual-fetch-count', '1');
    await expect(state).toHaveAttribute('data-manual-is-stale', 'false', { timeout: 10_000 });

    const viewport = page.viewportSize();
    const artifact = await createSyncStalenessArtifact(
      {
        staleMount: {
          fetchCount: Number(await state.getAttribute('data-auto-fetch-count')),
          isStale: (await state.getAttribute('data-auto-is-stale')) === 'true',
        },
        neverMount: {
          automaticFetchCount,
          manualFetchCount: Number(await state.getAttribute('data-manual-fetch-count')),
          isStale: (await state.getAttribute('data-manual-is-stale')) === 'true',
        },
      },
      {
        browser: testInfo.project.name,
        viewport: viewport ?? { width: 1280, height: 720 },
        dpr: await page.evaluate(() => window.devicePixelRatio),
      },
    );
    await writeMetrics(artifact);

    expect(artifact.currentStatus).toBe('passed');
  });

  test('describes stale and never mount strategies', async ({ page }) => {
    await page.goto('/sync/staleness');
    await expect(page.getByText('Strategy: Syncs on mount when data exceeds TTL')).toBeVisible();
    await expect(page.getByText('Strategy: Never auto-syncs - full manual control')).toBeVisible();
  });
});
