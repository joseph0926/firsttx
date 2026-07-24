import { expect, test } from '@playwright/test';

test.describe('Optimistic Cart deterministic fixtures', () => {
  test('paints the optimistic quantity while the server gate remains closed', async ({ page }) => {
    await page.goto('/sync/instant-cart');
    const increment = page.getByTestId('firsttx-increment-1');
    await expect(increment).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('instant-cart-fixture').selectOption('ack');
    await increment.click();
    const releaseServer = page.getByTestId('release-instant-cart-server');
    const events = page.getByTestId('instant-cart-events').locator('li');

    try {
      await expect(page.getByTestId('firsttx-increment-quantity-1')).toHaveText('2');
      await expect(events).toHaveText(['optimistic-patch', 'optimistic-paint']);
    } finally {
      await releaseServer.click();
    }

    await expect(events).toHaveText([
      'optimistic-patch',
      'optimistic-paint',
      'server-gate-released',
      'request-started',
      'server-gate-completed',
      'server-acknowledged',
    ]);
  });

  test('acknowledges a captured server release that occurs before the request begins', async ({
    page,
  }) => {
    await page.goto('/sync/instant-cart');
    const increment = page.getByTestId('firsttx-increment-1');
    await expect(increment).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('instant-cart-fixture').selectOption('ack');
    await increment.click();
    const events = page.getByTestId('instant-cart-events').locator('li');
    await expect(events).toHaveText(['optimistic-patch', 'optimistic-paint']);
    await page.getByTestId('release-instant-cart-server').click();

    await expect(events).toHaveText([
      'optimistic-patch',
      'optimistic-paint',
      'server-gate-released',
      'request-started',
      'server-gate-completed',
      'server-acknowledged',
    ]);
    const orderedEvents = await events.allTextContents();
    expect(orderedEvents.indexOf('server-gate-released')).toBeLessThan(
      orderedEvents.indexOf('request-started'),
    );
  });

  test('restores the optimistic snapshot after the fixed server rejection', async ({ page }) => {
    await page.goto('/sync/instant-cart');
    const increment = page.getByTestId('firsttx-increment-1');
    await expect(increment).toBeVisible({ timeout: 20_000 });
    const quantity = page.getByTestId('firsttx-increment-quantity-1');
    const before = await quantity.textContent();
    await page.getByTestId('instant-cart-fixture').selectOption('reject');
    await increment.click();
    await expect(quantity).toHaveText('2');
    const events = page.getByTestId('instant-cart-events').locator('li');
    await expect(events).toHaveText(['optimistic-patch', 'optimistic-paint']);
    await page.getByTestId('release-instant-cart-server').click();

    await expect(events).toHaveText([
      'optimistic-patch',
      'optimistic-paint',
      'server-gate-released',
      'request-started',
      'server-gate-completed',
      'snapshot-restored',
    ]);
    await expect(quantity).toHaveText(before ?? '');
  });
});
