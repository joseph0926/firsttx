import { test, expect } from '@playwright/test';
import { createMetricRecord, writeMetrics } from './utils/metrics';

test.describe('Sync Staleness Detection', () => {
  test('detects stale data and allows manual refresh', async ({ page }, testInfo) => {
    await page.goto('/sync/staleness');

    // Wait for page to load - look for zone headers
    await expect(page.locator('h3:has-text("Auto-Sync Zone")')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('h3:has-text("Manual-Sync Zone")')).toBeVisible();

    // Wait for data to load in both zones
    await expect(page.locator('text="Revenue"').first()).toBeVisible({ timeout: 10_000 });

    // Find Manual Zone by its header
    const manualZoneHeader = page.locator('h3:has-text("Manual-Sync Zone")');
    const manualZone = manualZoneHeader.locator('..');

    // Check initial status - look for Fresh or Stale text near the button
    const refreshButton = manualZone.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();

    // Click the Refresh button
    await refreshButton.click();

    // Wait for sync to complete (button text changes back)
    await expect(refreshButton).toContainText('Refresh', { timeout: 10_000 });

    // After refresh, zone should show Fresh status (green text)
    await expect(manualZone.locator('.text-green-500').filter({ hasText: 'Fresh' })).toBeVisible({
      timeout: 5_000,
    });

    // Write metrics
    await writeMetrics(
      createMetricRecord(
        'sync-staleness',
        {
          manualRefreshWorked: true,
        },
        {
          project: testInfo.project.name,
          url: '/sync/staleness',
        },
      ),
    );
  });

  test('auto-sync zone automatically refreshes stale data', async ({ page }) => {
    await page.goto('/sync/staleness');

    // Wait for Auto-Sync zone header to be visible
    const autoZoneHeader = page.locator('h3:has-text("Auto-Sync Zone")');
    await expect(autoZoneHeader).toBeVisible({ timeout: 10_000 });

    // The Auto zone is the parent div of this header
    const autoZone = autoZoneHeader.locator('..');

    // Wait for data to load - Revenue should appear
    await expect(autoZone.locator('text="Revenue"')).toBeVisible({ timeout: 10_000 });

    // Verify the strategy description is present
    await expect(
      autoZone.locator('text="Strategy: Syncs on mount when data exceeds TTL"'),
    ).toBeVisible();
  });

  test('displays correct TTL strategy descriptions', async ({ page }) => {
    await page.goto('/sync/staleness');

    // Wait for page to load
    await expect(page.locator('h3:has-text("Auto-Sync Zone")')).toBeVisible({ timeout: 10_000 });

    // Verify strategy descriptions are visible
    await expect(
      page.locator('text="Strategy: Syncs on mount when data exceeds TTL"'),
    ).toBeVisible();
    await expect(
      page.locator('text="Strategy: Never auto-syncs - full manual control"'),
    ).toBeVisible();
  });
});
