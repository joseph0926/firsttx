import { test, expect } from '@playwright/test';

test.describe('Playground home smoke test', () => {
  test('redirects to tour on first visit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('firsttx'));

    await page.goto('/');
    await page.waitForURL(/\/tour\/problem/);
    await expect(page.getByRole('heading', { name: /Familiar Problems/i })).toBeVisible();
  });

  test('renders hero content after skipping tour', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('firsttx'));

    await page.goto('/');
    await page.waitForURL(/\/tour\/problem/);

    await page.getByRole('button', { name: /Skip Tour/i }).click();
    await page.waitForURL('/');

    await expect(page.getByText('Make CSR Feel Like SSR')).toBeVisible();
    await expect(page.getByRole('link', { name: /5 Minute Tour/i })).toBeVisible();
  });
});
