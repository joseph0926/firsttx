import { test, expect, Page } from '@playwright/test';
import { createMetricRecord, writeMetrics } from './utils/metrics';

async function readConcurrentMetrics(page: Page) {
  return page.locator('[data-testid="concurrent-metrics"]').evaluate((node) => {
    return {
      successRate: node.getAttribute('data-success-rate'),
      avgDuration: node.getAttribute('data-avg-duration'),
      totalTransactions: node.getAttribute('data-total-transactions'),
      totalRetries: node.getAttribute('data-total-retries'),
      dataConsistent: node.getAttribute('data-data-consistent'),
    };
  });
}

test.describe('Concurrent updates metrics', () => {
  test('collects transaction stats', async ({ page }, testInfo) => {
    await page.goto('/tx/concurrent');

    await page.locator('[data-testid="concurrent-slider"]').evaluate((node: HTMLInputElement) => {
      node.value = '5';
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.locator('[data-testid="failure-slider"]').evaluate((node: HTMLInputElement) => {
      node.value = '80';
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.locator('[data-testid="launch-concurrent"]').click();

    const statusIndicator = page.locator('[data-testid="concurrent-metrics"]');
    await expect(statusIndicator).toHaveAttribute('data-total-transactions', /5/, {
      timeout: 20_000,
    });

    const attrs = await readConcurrentMetrics(page);
    const metrics = {
      successRate: Number(attrs.successRate ?? 0),
      averageDurationMs: Number(attrs.avgDuration ?? 0),
      totalTransactions: Number(attrs.totalTransactions ?? 0),
      totalRetries: Number(attrs.totalRetries ?? 0),
      dataConsistent: attrs.dataConsistent === 'true',
    };

    await writeMetrics(
      createMetricRecord('tx-concurrent', metrics, {
        project: testInfo.project.name,
        url: '/tx/concurrent',
      }),
    );
  });
});
