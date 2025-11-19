import { test, expect, Page } from '@playwright/test';
import { createMetricRecord, writeMetrics } from './utils/metrics';

async function readMetricsAttributes(page: Page) {
  return page.locator('[data-testid="instant-cart-metrics"]').evaluate((node) => {
    return {
      firstTxInitial: node.getAttribute('data-firsttx-initial'),
      traditionalInitial: node.getAttribute('data-traditional-initial'),
      firstTxAction: node.getAttribute('data-firsttx-action'),
      traditionalAction: node.getAttribute('data-traditional-action'),
      firstTxServerAck: node.getAttribute('data-firsttx-server-ack'),
      timeSaved: node.getAttribute('data-time-saved'),
    };
  });
}

test.describe('Instant Cart metrics', () => {
  test('collects latency comparisons', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('firsttx:autoLoadTraditional', '1');
    });
    await page.goto('/sync/instant-cart');

    const loadCartButton = page
      .locator('[data-testid="traditional-panel"]')
      .getByRole('button', { name: /Load Cart/i });
    if (await loadCartButton.isVisible()) {
      await loadCartButton.click();
      await expect(loadCartButton).toBeHidden({ timeout: 20_000 });
    }

    const traditionalPlus = page.locator('[data-testid^="traditional-increment-"]').first();
    await traditionalPlus.waitFor({ state: 'visible', timeout: 20_000 });
    await traditionalPlus.click();

    const firstTxPlus = page.locator('[data-testid^="firsttx-increment-"]').first();
    await firstTxPlus.waitFor({ state: 'visible', timeout: 20_000 });
    await firstTxPlus.click();

    await expect(page.locator('[data-testid="instant-cart-metrics"]')).toHaveAttribute(
      'data-firsttx-action',
      /.+/,
      { timeout: 10_000 },
    );

    const attrs = await readMetricsAttributes(page);

    const metrics = {
      firstTxInitialLoadMs: Number(attrs.firstTxInitial ?? 0),
      traditionalInitialLoadMs: Number(attrs.traditionalInitial ?? 0),
      firstTxActionLatency: Number(attrs.firstTxAction ?? 0),
      traditionalActionLatency: Number(attrs.traditionalAction ?? 0),
      firstTxServerAckMs: Number(attrs.firstTxServerAck ?? 0),
      timeSavedPerInteraction: Number(attrs.timeSaved ?? 0),
    };

    await writeMetrics(
      createMetricRecord('instant-cart', metrics, {
        project: testInfo.project.name,
        url: '/sync/instant-cart',
      }),
    );
  });
});
