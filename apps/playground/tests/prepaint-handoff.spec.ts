import { expect, test } from '@playwright/test';

async function waitForSnapshot(page: import('@playwright/test').Page, route: string) {
  await page.waitForFunction(
    async ({ routeKey }) => {
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open('firsttx-prepaint', 2);
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('snapshots', 'readonly');
          const getRequest = tx.objectStore('snapshots').get(routeKey);
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
    },
    { routeKey: route },
  );
}

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

    await waitForSnapshot(page, '/prepaint/heavy');

    let releaseMain!: () => void;
    const mainGate = new Promise<void>((resolve) => {
      releaseMain = resolve;
    });
    let notifyMainRequested!: () => void;
    const mainRequested = new Promise<void>((resolve) => {
      notifyMainRequested = resolve;
    });

    await page.route(/\/src\/main\.tsx(?:\?.*)?$/, async (route) => {
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

  test('stores route-switching snapshots under exact route keys', async ({ page }) => {
    await page.goto('/prepaint/route-switching/dashboard', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await waitForSnapshot(page, '/prepaint/route-switching/dashboard');

    await page.goto('/prepaint/route-switching/products', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await waitForSnapshot(page, '/prepaint/route-switching/products');

    const routes = await page.evaluate(async () => {
      return new Promise<string[]>((resolve) => {
        const request = indexedDB.open('firsttx-prepaint', 2);
        request.onerror = () => resolve([]);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('snapshots', 'readonly');
          const keysRequest = tx.objectStore('snapshots').getAllKeys();
          keysRequest.onerror = () => {
            db.close();
            resolve([]);
          };
          keysRequest.onsuccess = () => {
            const keys = keysRequest.result.map(String);
            db.close();
            resolve(keys);
          };
        };
      });
    });

    expect(routes).toContain('/prepaint/route-switching/dashboard');
    expect(routes).toContain('/prepaint/route-switching/products');
  });

  test('clears schema v1 snapshots before restore', async ({ page }) => {
    let releaseBoot!: () => void;
    const bootGate = new Promise<void>((resolve) => {
      releaseBoot = resolve;
    });

    await page.route('**/firsttx-boot.js', async (route) => {
      await bootGate;
      await route.continue();
    });

    await page.goto('/prepaint/heavy', { waitUntil: 'commit' });

    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('firsttx-prepaint', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('snapshots', { keyPath: 'route' }).put({
            route: '/prepaint/heavy',
            timestamp: Date.now(),
            body: '<div id="legacy-snapshot">Legacy</div>',
            styles: [],
          });
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
      });
    });

    releaseBoot();
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      return new Promise<{ version: number; snapshot: unknown }>((resolve, reject) => {
        const request = indexedDB.open('firsttx-prepaint', 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('snapshots', 'readonly');
          const getRequest = tx.objectStore('snapshots').get('/prepaint/heavy');
          getRequest.onerror = () => reject(getRequest.error);
          getRequest.onsuccess = () => {
            const value = { version: db.version, snapshot: getRequest.result ?? null };
            db.close();
            resolve(value);
          };
        };
      });
    });

    expect(result).toEqual({ version: 2, snapshot: null });
    await expect(page.locator('#legacy-snapshot')).toHaveCount(0);
  });
});
