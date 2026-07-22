import { test, expect } from '@playwright/test';

test.describe('Playground home smoke test', () => {
  test('shows guided and verification entry points on first visit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('firsttx'));

    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Try the behavior. Check the contract.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Take the guided tour/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /View verification criteria/i }).first(),
    ).toBeVisible();
  });

  test('returns to the redesigned home after skipping the guided tour', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('firsttx'));

    await page.goto('/');
    await page.getByRole('link', { name: /Take the guided tour/i }).click();
    await page.waitForURL(/\/tour\/problem/);

    await page.getByRole('button', { name: /Skip Tour/i }).click();
    await page.waitForURL('/');

    await expect(page.getByText('Try the behavior. Check the contract.')).toBeVisible();
  });

  test('renders all scenario contracts in the verification lab', async ({ page }) => {
    await page.goto('/lab');

    await expect(
      page.getByRole('heading', { name: /Contracts and release criteria by scenario/i }),
    ).toBeVisible();
    await expect(page.locator('.atlas-ledger > article')).toHaveCount(9);
    await expect(page.getByText('GitHub Pages manifest', { exact: true })).toBeVisible();
  });
});
