import { expect, test, type Page } from '@playwright/test';

const tourSteps = [
  { path: '/tour/problem', label: 'Problem' },
  { path: '/tour/prepaint', label: 'Prepaint' },
  { path: '/tour/local-first', label: 'Local-First' },
  { path: '/tour/tx', label: 'Tx' },
  { path: '/tour/next', label: 'Start' },
];

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const normalized = hex.trim().replace('#', '');
  const channels = [0, 2, 4].map((offset) =>
    channelToLinear(Number.parseInt(normalized.slice(offset, offset + 2), 16)),
  );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

async function setPreferences(page: Page, locale: 'en' | 'ko', theme: 'light' | 'dark') {
  await page.addInitScript(
    ({ nextLocale, nextTheme }) => {
      localStorage.setItem('firsttx-locale', nextLocale);
      localStorage.setItem('vite-ui-theme', nextTheme);
    },
    { nextLocale: locale, nextTheme: theme },
  );
}

test.describe('Guided tour accessibility', () => {
  test('announces and completes every guided step', async ({ page }) => {
    await setPreferences(page, 'en', 'light');
    await page.goto(tourSteps[0].path);

    for (const [index, step] of tourSteps.entries()) {
      await expect(page).toHaveURL(step.path);

      const progress = page.getByRole('progressbar');
      await expect(progress).toHaveAttribute('aria-valuenow', String(index + 1));
      await expect(progress).toHaveAttribute(
        'aria-valuetext',
        `${step.label} (${index + 1}/${tourSteps.length})`,
      );
      await expect(page.locator('[aria-current="step"]')).toHaveText(step.label);

      if (index < tourSteps.length - 1) {
        await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
    }

    await page.getByRole('button', { name: 'Explore Playground', exact: true }).click();
    await expect(page).toHaveURL('/');
  });

  test('keeps the current step visible and reflows at 390px in both locales', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setPreferences(page, 'ko', 'light');
    await page.goto('/tour/problem');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
    await expect(page.getByText('문제 · 1/5', { exact: true })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '문제 (1/5)');

    const koreanWidth = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(koreanWidth.document).toBeLessThanOrEqual(koreanWidth.viewport);

    await page.getByRole('button', { name: 'EN', exact: true }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Problem · 1/5', { exact: true })).toBeVisible();

    const englishWidth = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(englishWidth.document).toBeLessThanOrEqual(englishWidth.viewport);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`keeps tour text contrast above 4.5:1 in ${theme} theme`, async ({ page }) => {
      await setPreferences(page, 'en', theme);
      await page.goto('/tour/prepaint');

      const colors = await page.locator('.atlas-tour-shell').evaluate((shell) => {
        const rootStyle = getComputedStyle(document.documentElement);
        const shellStyle = getComputedStyle(shell);

        return {
          background: shellStyle.getPropertyValue('--atlas-bg'),
          foreground: shellStyle.getPropertyValue('--atlas-ink'),
          surface: rootStyle.getPropertyValue('--tour-surface'),
          strongSurface: rootStyle.getPropertyValue('--tour-surface-strong'),
          danger: rootStyle.getPropertyValue('--status-danger'),
          success: rootStyle.getPropertyValue('--status-success'),
          warning: rootStyle.getPropertyValue('--status-warning'),
          info: rootStyle.getPropertyValue('--status-info'),
        };
      });

      expect(contrastRatio(colors.foreground, colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.foreground, colors.strongSurface)).toBeGreaterThanOrEqual(4.5);

      for (const status of [colors.danger, colors.success, colors.warning, colors.info]) {
        expect(contrastRatio(status, colors.background)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
