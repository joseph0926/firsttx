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

    const concurrentSlider = page.getByTestId('concurrent-slider');
    const failureSlider = page.getByTestId('failure-slider');

    await concurrentSlider.fill('5');
    await failureSlider.fill('80');
    await expect(concurrentSlider).toHaveValue('5');
    await expect(failureSlider).toHaveValue('80');
    await expect(page.getByText('Concurrent Transactions: 5', { exact: true })).toBeVisible();
    await expect(page.getByText('Failure Rate: 80%', { exact: true })).toBeVisible();

    await page.getByTestId('launch-concurrent').click();
    await expect(page.getByTestId('concurrent-gates')).toHaveAttribute('data-ready-count', '5');
    await page.getByTestId('release-concurrent-gates').click();

    const statusIndicator = page.getByTestId('concurrent-metrics');
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
