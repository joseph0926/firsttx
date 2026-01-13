import { test, expect } from '@playwright/test';
import { createMetricRecord, writeMetrics } from './utils/metrics';

test.describe('Prepaint Route Switching', () => {
  test('navigates between routes and tracks visits', async ({ page }, testInfo) => {
    await page.goto('/prepaint/route-switching/dashboard');

    // Wait for dashboard to load
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10_000 });

    // Navigate to Products
    await page.locator('a:has-text("Products")').click();
    await expect(page.locator('h2:has-text("Products")')).toBeVisible();

    // Navigate to Analytics
    await page.locator('a:has-text("Analytics")').click();
    await expect(page.locator('h2:has-text("Analytics")')).toBeVisible();

    // Navigate to Settings
    await page.locator('a:has-text("Settings")').click();
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible();

    // Navigate back to Dashboard
    await page.locator('a:has-text("Dashboard")').click();
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();

    // Wait for metrics to update
    await page.waitForTimeout(500);

    // Check Route Metrics section exists and shows visited routes
    const routeMetricsSection = page.locator('h3:has-text("Route Metrics")');
    await expect(routeMetricsSection).toBeVisible();

    // Go up to the card container (grandparent) that includes the route metrics
    const routeMetricsCard = routeMetricsSection.locator('../..');

    // Check for visit counts in the metrics area (format: "N visits")
    const visitTexts = routeMetricsCard.locator('text=/\\d+ visits/');
    const visitCount = await visitTexts.count();

    // Write metrics
    await writeMetrics(
      createMetricRecord(
        'prepaint-route-switching',
        {
          routesWithVisits: visitCount,
          allRoutesVisited: visitCount >= 4,
        },
        {
          project: testInfo.project.name,
          url: '/prepaint/route-switching',
        },
      ),
    );

    // At least some routes should have visits recorded
    expect(visitCount).toBeGreaterThan(0);
  });

  test('displays route navigation tabs', async ({ page }) => {
    await page.goto('/prepaint/route-switching/dashboard');

    // Wait for page to load
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10_000 });

    // Check all navigation tabs are present
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Products")')).toBeVisible();
    await expect(page.locator('a:has-text("Analytics")')).toBeVisible();
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();
  });

  test('syncs metrics with server', async ({ page }) => {
    await page.goto('/prepaint/route-switching/dashboard');

    // Wait for page to load
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10_000 });

    // Click sync button
    const syncButton = page.locator('button:has-text("Sync with Server")');
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Button should show syncing state briefly
    // Wait for sync to complete
    await expect(syncButton).toContainText('Sync with Server', { timeout: 10_000 });
  });

  test('loads each route correctly', async ({ page }) => {
    // Test each route loads its content
    const routes = [
      { path: '/prepaint/route-switching/dashboard', content: 'Total Revenue' },
      { path: '/prepaint/route-switching/products', content: 'Product 1' },
      { path: '/prepaint/route-switching/analytics', content: 'Traffic Sources' },
      { path: '/prepaint/route-switching/settings', content: 'Notification Preferences' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator(`text="${route.content}"`)).toBeVisible({ timeout: 10_000 });
    }
  });
});
