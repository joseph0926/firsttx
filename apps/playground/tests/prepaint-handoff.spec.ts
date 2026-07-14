import { expect, test } from '@playwright/test';

test.describe('Prepaint visual handoff', () => {
  test('keeps the visual overlay until delayed React commits', async ({ page }) => {
    const root = page.locator('#root');
    const overlay = page.locator('#__firsttx_prepaint__');
    const grid = page.getByTestId('product-grid');

    await page.goto('/prepaint/heavy', { waitUntil: 'networkidle' });
    await expect(grid).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
    });

    await page.waitForFunction(async () => {
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open('firsttx-prepaint', 1);
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('snapshots', 'readonly');
          const getRequest = tx.objectStore('snapshots').get('/prepaint/heavy');
          getRequest.onerror = () => {
            db.close();
            resolve(false);
          };
          getRequest.onsuccess = () => {
            const found = Boolean(getRequest.result);
            db.close();
            resolve(found);
          };
        };
      });
    });

    let releaseMain!: () => void;
    const mainGate = new Promise<void>((resolve) => {
      releaseMain = resolve;
    });
    let notifyMainRequested!: () => void;
    const mainRequested = new Promise<void>((resolve) => {
      notifyMainRequested = resolve;
    });

    await page.route('**/src/main.tsx', async (route) => {
      notifyMainRequested();
      await mainGate;
      await route.continue();
    });

    await page.reload({ waitUntil: 'commit' });
    await mainRequested;

    await expect(overlay).toBeAttached();
    await expect(root).toBeEmpty();
    expect(await overlay.evaluate((host) => getComputedStyle(host).pointerEvents)).toBe('none');
    expect(await overlay.evaluate((host) => host.shadowRoot?.textContent)).toContain('Product');

    releaseMain();

    await expect(grid).toBeVisible();
    await expect(overlay).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-prepaint');
  });
});
