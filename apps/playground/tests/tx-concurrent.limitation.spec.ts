import { expect, test } from '@playwright/test';

test.describe('Overlapping hook call limitation', () => {
  test('replays the seeded outcome sequence', async ({ page }) => {
    await page.goto('/tx/concurrent');
    await expect(page.getByTestId('launch-concurrent')).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId('failure-slider').fill('80');
    await expect(page.getByTestId('failure-slider')).toHaveValue('80');
    await expect(page.getByText('Failure Rate: 80%', { exact: true })).toBeVisible();
    await page.getByTestId('launch-concurrent').click();
    await expect(page.getByTestId('concurrent-gates')).toHaveAttribute('data-ready-count', '5');
    await page.getByTestId('release-concurrent-gates').click();
    await expect(page.getByTestId('concurrent-metrics')).toHaveAttribute('data-success-rate', '20');
  });

  test('shows that cancelling one shared hook controller cancels overlapping calls', async ({
    page,
  }) => {
    await page.goto('/tx/concurrent');
    await expect(page.getByTestId('launch-concurrent')).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId('failure-slider').fill('0');
    await expect(page.getByTestId('failure-slider')).toHaveValue('0');
    await expect(page.getByText('Failure Rate: 0%', { exact: true })).toBeVisible();
    await page.getByTestId('launch-concurrent').click();
    await expect(page.getByTestId('concurrent-gates')).toHaveAttribute('data-ready-count', '5');
    await page.getByTestId('cancel-concurrent').click();
    for (let txId = 1; txId <= 5; txId += 1) {
      await expect(page.getByTestId(`concurrent-tx-${txId}`)).toHaveAttribute(
        'data-status',
        'rolled-back',
      );
      await expect(page.getByTestId(`inventory-item-${txId}`)).toHaveAttribute(
        'data-reserved',
        '0',
      );
    }
    await expect(page.getByTestId('concurrent-hook-state')).toHaveAttribute(
      'data-pending',
      'false',
    );
    await expect(page.getByTestId('concurrent-hook-state')).toHaveAttribute(
      'data-is-error',
      'false',
    );
    await expect(page.getByTestId('concurrent-metrics')).toHaveAttribute('data-success-rate', '0');
    await expect(page.getByTestId('release-concurrent-gates')).toBeDisabled();
  });
});
