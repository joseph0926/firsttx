import { test, expect } from '@playwright/test';

test.describe('Playground home smoke test', () => {
  test('renders hero content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('FirstTx Performance Arena')).toBeVisible();
    await expect(page.getByRole('link', { name: /Getting Started Guide/i })).toBeVisible();
  });
});
