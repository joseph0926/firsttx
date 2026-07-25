import { expect, test, type Page } from '@playwright/test';
import { createInstantCartArtifact, writeMetrics } from './utils/metrics';

const warmupRunCount = 3;
const measuredRunCount = 20;
const expectedEvents = [
  'optimistic-patch',
  'optimistic-paint',
  'server-gate-released',
  'request-started',
  'server-gate-completed',
  'server-acknowledged',
] as const;

interface InstantCartSample {
  inputToOptimisticPaintMs: number;
  serverAckMs: number;
  traditionalInputToPaintMs: number;
  events: string[];
}

async function readPositiveAttribute(page: Page, name: string) {
  const metrics = page.getByTestId('instant-cart-metrics');
  await expect
    .poll(async () => Number(await metrics.getAttribute(name)), { timeout: 10_000 })
    .toBeGreaterThan(0);
  return Number(await metrics.getAttribute(name));
}

async function measureInstantCart(page: Page): Promise<InstantCartSample> {
  const traditionalButton = page.getByTestId('traditional-increment-1');
  const traditionalQuantity = page.getByTestId('traditional-increment-quantity-1');
  const traditionalBefore = Number(await traditionalQuantity.textContent());
  await traditionalButton.click();
  await expect(traditionalQuantity).toHaveText(String(traditionalBefore + 1), { timeout: 10_000 });
  const traditionalInputToPaintMs = await readPositiveAttribute(page, 'data-traditional-action');
  await expect(traditionalButton).toBeEnabled();

  const firstTxButton = page.getByTestId('firsttx-increment-1');
  const firstTxQuantity = page.getByTestId('firsttx-increment-quantity-1');
  const firstTxBefore = Number(await firstTxQuantity.textContent());
  await firstTxButton.click();
  await expect(firstTxQuantity).toHaveText(String(firstTxBefore + 1));
  const events = page.getByTestId('instant-cart-events').locator('li');
  await expect(events).toHaveText(['optimistic-patch', 'optimistic-paint']);
  const inputToOptimisticPaintMs = await readPositiveAttribute(page, 'data-firsttx-action');

  await page.getByTestId('release-instant-cart-server').click();
  await expect(events).toHaveText([...expectedEvents]);
  const serverAckMs = await readPositiveAttribute(page, 'data-firsttx-server-ack');
  await expect(page.getByTestId('instant-cart-fixture')).toBeEnabled();

  return {
    inputToOptimisticPaintMs,
    serverAckMs,
    traditionalInputToPaintMs,
    events: await events.allTextContents(),
  };
}

test.describe('Instant Cart metrics', () => {
  test.setTimeout(120_000);

  let completedWarmups = 0;
  let failedSamples = 0;
  let passedRuns = 0;
  let latestEvents: string[] = [];
  let inputToOptimisticPaintMs: number[] = [];
  let serverAckMs: number[] = [];
  let traditionalInputToPaintMs: number[] = [];

  test.beforeEach(() => {
    completedWarmups = 0;
    failedSamples = 0;
    passedRuns = 0;
    latestEvents = [];
    inputToOptimisticPaintMs = [];
    serverAckMs = [];
    traditionalInputToPaintMs = [];
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) {
      return;
    }

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const dpr = page.isClosed()
      ? 1
      : await page.evaluate(() => window.devicePixelRatio).catch(() => 1);
    const artifact = await createInstantCartArtifact(
      {
        warmupRuns: completedWarmups,
        failedSamples: Math.max(failedSamples, 1),
        passedRuns,
        events: latestEvents as (typeof expectedEvents)[number][],
        inputToOptimisticPaintMs,
        serverAckMs,
        traditionalInputToPaintMs,
      },
      {
        browser: testInfo.project.name,
        viewport,
        dpr,
      },
    );
    await writeMetrics(artifact);
  });

  test('publishes 3 warm-up and 20 measured latency samples', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('firsttx:autoLoadTraditional', '1');
    });
    await page.goto('/sync/instant-cart');
    await expect(page.getByTestId('traditional-increment-1')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('firsttx-increment-1')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('instant-cart-fixture').selectOption('ack');

    for (let index = 0; index < warmupRunCount + measuredRunCount; index += 1) {
      let sample: InstantCartSample;
      try {
        sample = await measureInstantCart(page);
      } catch (error) {
        failedSamples += 1;
        throw error;
      }

      latestEvents = sample.events;
      if (index < warmupRunCount) {
        completedWarmups += 1;
        continue;
      }

      passedRuns += 1;
      inputToOptimisticPaintMs.push(sample.inputToOptimisticPaintMs);
      serverAckMs.push(sample.serverAckMs);
      traditionalInputToPaintMs.push(sample.traditionalInputToPaintMs);
    }

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const artifact = await createInstantCartArtifact(
      {
        warmupRuns: completedWarmups,
        failedSamples,
        passedRuns,
        events: latestEvents as (typeof expectedEvents)[number][],
        inputToOptimisticPaintMs,
        serverAckMs,
        traditionalInputToPaintMs,
      },
      {
        browser: testInfo.project.name,
        viewport,
        dpr: await page.evaluate(() => window.devicePixelRatio),
      },
    );
    await writeMetrics(artifact);

    expect(artifact.currentStatus).toBe('passed');
  });
});
