import { test, expect, Page } from '@playwright/test';
import { createMetricRecord, writeMetrics } from './utils/metrics';

type NavigationMetrics = {
  domContentLoaded: number;
  loadEventEnd: number;
  responseStart: number;
  firstContentfulPaint: number | null;
};

async function collectNavigationMetrics(page: Page): Promise<NavigationMetrics> {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null;

    if (!nav) {
      return {
        domContentLoaded: NaN,
        loadEventEnd: NaN,
        responseStart: NaN,
        firstContentfulPaint: fcp,
      };
    }

    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadEventEnd: nav.loadEventEnd - nav.startTime,
      responseStart: nav.responseStart - nav.startTime,
      firstContentfulPaint: fcp,
    };
  });
}

test.describe('Prepaint Heavy scenario metrics', () => {
  test('captures cold vs warm load timings', async ({ page }, testInfo) => {
    const grid = page.getByTestId('product-grid');

    await page.goto('/prepaint/heavy', { waitUntil: 'networkidle' });
    await grid.waitFor({ state: 'visible' });
    const coldLoadMs = await page.evaluate(() => performance.now());
    const coldNav = await collectNavigationMetrics(page);

    await page.reload({ waitUntil: 'networkidle' });
    await grid.waitFor({ state: 'visible' });
    const warmLoadMs = await page.evaluate(() => performance.now());
    const warmNav = await collectNavigationMetrics(page);

    const coldFcp = coldNav.firstContentfulPaint;
    const warmFcp = warmNav.firstContentfulPaint;
    if (coldFcp !== null && warmFcp !== null) {
      expect(warmFcp).toBeLessThanOrEqual(coldFcp + 20);
    }

    const metrics = {
      coldHydrationCompleteMs: Number(coldLoadMs.toFixed(2)),
      warmHydrationCompleteMs: Number(warmLoadMs.toFixed(2)),
      coldFirstContentfulPaint: coldFcp,
      warmFirstContentfulPaint: warmFcp,
      coldDomContentLoaded: Number(coldNav.domContentLoaded.toFixed(2)),
      warmDomContentLoaded: Number(warmNav.domContentLoaded.toFixed(2)),
      blankScreenReductionMs:
        coldFcp !== null && warmFcp !== null ? Number((coldFcp - warmFcp).toFixed(2)) : null,
    };

    await writeMetrics(
      createMetricRecord('prepaint-heavy', metrics, {
        project: testInfo.project.name,
        url: '/prepaint/heavy',
      }),
    );
  });
});
