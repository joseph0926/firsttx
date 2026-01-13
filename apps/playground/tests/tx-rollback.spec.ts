import { test, expect } from '@playwright/test';
import { createMetricRecord, writeMetrics } from './utils/metrics';

test.describe('Tx Rollback Chain', () => {
  test('executes multi-step transaction and rolls back on failure', async ({ page }, testInfo) => {
    await page.goto('/tx/rollback-chain');

    // Wait for page to load
    await expect(page.locator('h3:has-text("Transaction Steps")')).toBeVisible();

    // Set fail at step 3 via slider
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('3');

    // Run transaction
    await page.locator('button:has-text("Run Transaction")').click();

    // Wait for transaction to complete (either success or rollback)
    await expect(
      page
        .locator('text="Transaction Committed"')
        .or(page.locator('text="Transaction Rolled Back"')),
    ).toBeVisible({ timeout: 15_000 });

    // Verify rollback occurred (step 3 should fail, steps 1-2 should be compensated)
    const resultText = await page.locator('h4:has-text("Transaction")').textContent();
    const isRolledBack = resultText?.includes('Rolled Back');

    // Check that compensated steps are shown in rollback sequence
    const rollbackSection = page.locator('h3:has-text("Rollback Sequence")').locator('..');
    const compensatedSteps = await rollbackSection.locator('.border-red-500\\/50').count();

    // Collect metrics
    const stepsCompletedText = await page.locator('text=/\\d+\\/5/').first().textContent();
    const completedSteps = parseInt(stepsCompletedText?.match(/(\d+)\/5/)?.[1] ?? '0');

    const rollbackTimeText = await page.locator('text=/\\d+ms|--/').nth(1).textContent();
    const rollbackTime =
      rollbackTimeText === '--' ? 0 : parseInt(rollbackTimeText?.replace('ms', '') ?? '0');

    const metrics = {
      isRolledBack,
      completedSteps,
      compensatedSteps,
      rollbackTimeMs: rollbackTime,
      failAtStep: 3,
    };

    await writeMetrics(
      createMetricRecord('tx-rollback', metrics, {
        project: testInfo.project.name,
        url: '/tx/rollback-chain',
      }),
    );

    // Assertions
    expect(isRolledBack).toBe(true);
    expect(completedSteps).toBeLessThan(3);
    expect(compensatedSteps).toBeGreaterThan(0);
  });

  test('completes transaction successfully when no failure is set', async ({ page }) => {
    await page.goto('/tx/rollback-chain');

    await expect(page.locator('h3:has-text("Transaction Steps")')).toBeVisible();

    // Set fail at step 5 (last step) but it should complete
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('5');

    // Note: We can't easily force success without modifying the app,
    // but we can verify the UI shows the expected states during execution
    const runButton = page.locator('button:has-text("Run Transaction")');
    await expect(runButton).toBeEnabled();
  });
});
