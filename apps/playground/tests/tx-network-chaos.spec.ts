import { test, expect } from '@playwright/test';
import { createMetricRecord, writeMetrics } from './utils/metrics';

test.describe('Tx Network Chaos', () => {
  test('handles retries and rollback under network failure', async ({ page }, testInfo) => {
    await page.goto('/tx/network-chaos');

    // Wait for page to load
    await expect(page.locator('h3:has-text("Chaos Configuration")')).toBeVisible();

    // Select chaos type: 500 (recovers after 2nd attempt)
    await page.locator('select').selectOption('500');

    // Set retry count to 2 via slider
    const retrySlider = page.locator('input[type="range"]').first();
    await retrySlider.fill('2');

    // Run chaos test
    await page.locator('button:has-text("Run Chaos Test")').click();

    // Wait for test to complete (button should be re-enabled)
    await expect(page.locator('button:has-text("Run Chaos Test")')).toBeEnabled({
      timeout: 30_000,
    });

    // Wait for summary to appear
    await expect(page.locator('h3:has-text("Test Summary")')).toBeVisible();

    // Read stats from the summary section
    const totalRequests = await page
      .locator('text="Total Requests:"')
      .locator('..')
      .locator('span.font-medium')
      .textContent();
    const succeeded = await page
      .locator('.bg-green-500\\/10')
      .locator('span.text-green-500')
      .textContent();
    const retried = await page
      .locator('.bg-yellow-500\\/10')
      .locator('span.text-yellow-500')
      .textContent();
    const failed = await page
      .locator('.bg-red-500\\/10')
      .locator('span.text-red-500')
      .textContent();

    const metrics = {
      chaosType: '500',
      maxRetries: 2,
      totalRequests: parseInt(totalRequests ?? '0'),
      succeeded: parseInt(succeeded ?? '0'),
      retried: parseInt(retried ?? '0'),
      failed: parseInt(failed ?? '0'),
    };

    await writeMetrics(
      createMetricRecord('tx-network-chaos', metrics, {
        project: testInfo.project.name,
        url: '/tx/network-chaos',
      }),
    );

    // With 500 error mode and 2 retries, all 3 requests should eventually succeed
    expect(metrics.succeeded).toBe(3);
    expect(metrics.failed).toBe(0);
  });

  test('fails all requests with timeout chaos and no retries', async ({ page }) => {
    await page.goto('/tx/network-chaos');

    await expect(page.locator('h3:has-text("Chaos Configuration")')).toBeVisible();

    // Select timeout mode (always fails)
    await page.locator('select').selectOption('timeout');

    // Set retry count to 0
    const retrySlider = page.locator('input[type="range"]').first();
    await retrySlider.fill('0');

    // Run chaos test
    await page.locator('button:has-text("Run Chaos Test")').click();

    // Wait for test to complete
    await expect(page.locator('button:has-text("Run Chaos Test")')).toBeEnabled({
      timeout: 45_000,
    });

    // All requests should fail
    await expect(page.locator('h3:has-text("Test Summary")')).toBeVisible();
    const failed = await page
      .locator('.bg-red-500\\/10')
      .locator('span.text-red-500')
      .textContent();
    expect(parseInt(failed ?? '0')).toBe(3);
  });

  test('succeeds with stable network (chaos: none)', async ({ page }) => {
    await page.goto('/tx/network-chaos');

    await expect(page.locator('h3:has-text("Chaos Configuration")')).toBeVisible();

    // Select none (stable)
    await page.locator('select').selectOption('none');

    // Run chaos test
    await page.locator('button:has-text("Run Chaos Test")').click();

    // Wait for test to complete
    await expect(page.locator('button:has-text("Run Chaos Test")')).toBeEnabled({
      timeout: 15_000,
    });

    // All requests should succeed
    await expect(page.locator('h3:has-text("Test Summary")')).toBeVisible();
    const succeeded = await page
      .locator('.bg-green-500\\/10')
      .locator('span.text-green-500')
      .textContent();
    expect(parseInt(succeeded ?? '0')).toBe(3);
  });
});
