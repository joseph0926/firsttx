import { expect, test, type Page } from '@playwright/test';

type TimingCartModule = typeof import('../src/models/timing-cart.model');

const timingFailureStorageKey = 'firsttx:timing-fixture-failure';

const fixtures = [
  {
    interleaving: 'before-rollback',
    expectedQuantity: '4',
    events: [
      'Transaction started',
      'Optimistic patch applied (+1)',
      'External server replacement applied (5)',
      'Forced request failure',
      'Rollback started',
      'Rollback patch applied (-1)',
    ],
  },
  {
    interleaving: 'during-rollback',
    expectedQuantity: '4',
    events: [
      'Transaction started',
      'Optimistic patch applied (+1)',
      'Forced request failure',
      'Rollback started',
      'External server replacement applied (5)',
      'Rollback patch applied (-1)',
    ],
  },
  {
    interleaving: 'after-rollback',
    expectedQuantity: '5',
    events: [
      'Transaction started',
      'Optimistic patch applied (+1)',
      'Forced request failure',
      'Rollback started',
      'Rollback patch applied (-1)',
      'External server replacement applied (5)',
    ],
  },
] as const;

const expectedFailure = {
  errorType: 'RetryExhaustedError',
  stepId: 'step-1',
  attempts: '1',
  cause: 'Deterministic fixture failure',
};

const recoveryFixtures = [
  {
    failurePoint: 'initialization',
    action: 'load',
    expectedMessage: 'Fixture initialization failed: Injected initialization reset failure',
  },
  {
    failurePoint: 'run-reset',
    action: 'run',
    expectedMessage: 'Fixture run reset failed: Injected pre-run reset failure',
  },
  {
    failurePoint: 'manual-reset',
    action: 'reset',
    expectedMessage: 'Fixture reset failed: Injected manual reset failure',
  },
] as const;

async function getSubscriptionWitness(page: Page) {
  return page.evaluate(async () => {
    const moduleUrl = '/src/models/timing-cart.model.ts';
    const timingCartModule = (await import(moduleUrl)) as TimingCartModule;

    return timingCartModule.getTimingCartSubscriptionWitness();
  });
}

test.describe('Replace / Rollback Ordering', () => {
  test.describe.configure({ mode: 'serial' });

  for (const fixture of fixtures) {
    test(`reproduces the ${fixture.interleaving} expected limitation`, async ({ page }) => {
      await page.goto('/sync/timing');
      await page.getByTestId('timing-interleaving').selectOption(fixture.interleaving);
      await page.getByTestId('run-timing-fixture').click();

      await expect(page.getByTestId('timing-final-quantity')).toHaveText(fixture.expectedQuantity);
      await expect(page.getByTestId('timing-result')).toContainText(
        'Expected limitation reproduced',
      );
      await expect(page.getByTestId('timing-final-quantity')).toHaveAttribute(
        'data-result',
        'expected-limitation',
      );
      await expect(page.getByTestId('timing-fixture-failure')).toHaveAttribute(
        'data-error-type',
        expectedFailure.errorType,
      );
      await expect(page.getByTestId('timing-fixture-failure')).toHaveAttribute(
        'data-step-id',
        expectedFailure.stepId,
      );
      await expect(page.getByTestId('timing-fixture-failure')).toHaveAttribute(
        'data-attempts',
        expectedFailure.attempts,
      );
      await expect(page.getByTestId('timing-fixture-failure')).toHaveAttribute(
        'data-cause',
        expectedFailure.cause,
      );
      await expect(page.getByTestId('timing-timeline').locator('li > span:last-child')).toHaveText(
        fixture.events,
      );
    });
  }

  test('resets the dedicated fixture namespace before replay', async ({ page }) => {
    await page.goto('/sync/timing');
    await page.getByTestId('timing-interleaving').selectOption('after-rollback');
    await page.getByTestId('run-timing-fixture').click();
    await expect(page.getByTestId('timing-final-quantity')).toHaveText('5');

    await page.getByTestId('reset-timing-fixture').click();
    await expect(page.getByTestId('timing-final-quantity')).toHaveText('1');
    await expect(page.getByTestId('timing-final-quantity')).toHaveAttribute(
      'data-result',
      'not-run',
    );
    await expect(page.getByTestId('run-timing-fixture')).toBeEnabled();
    await expect(page.getByTestId('reset-timing-fixture')).toBeEnabled();
  });

  test('re-subscribes after the StrictMode cleanup and receives the next model update', async ({
    page,
  }) => {
    await page.goto('/sync/timing');
    await expect(page.getByTestId('run-timing-fixture')).toBeEnabled();

    const beforeUpdate = await getSubscriptionWitness(page);

    expect(beforeUpdate.events).toEqual([
      { phase: 'setup', subscriptionId: 1, activeSubscriptions: 1 },
      { phase: 'cleanup', subscriptionId: 1, activeSubscriptions: 0 },
      { phase: 'setup', subscriptionId: 2, activeSubscriptions: 1 },
    ]);
    expect(beforeUpdate.activeSubscriptions).toBe(1);

    await page.evaluate(async () => {
      const moduleUrl = '/src/models/timing-cart.model.ts';
      const timingCartModule = (await import(moduleUrl)) as TimingCartModule;

      await timingCartModule.TimingCartModel.replace(
        structuredClone(timingCartModule.TIMING_SERVER_CART),
      );
    });

    await expect(page.getByTestId('timing-final-quantity')).toHaveText('5');

    const afterUpdate = await getSubscriptionWitness(page);

    expect(afterUpdate.deliveredUpdates).toBe(beforeUpdate.deliveredUpdates + 1);
    expect(afterUpdate.lastDeliveredSubscriptionId).toBe(2);
    expect(afterUpdate.activeSubscriptions).toBe(1);
  });

  for (const fixture of recoveryFixtures) {
    test(`recovers controls after the ${fixture.failurePoint} failure`, async ({ page }) => {
      await page.addInitScript(
        ({ key, failurePoint }) => {
          window.sessionStorage.setItem(key, failurePoint);
        },
        { key: timingFailureStorageKey, failurePoint: fixture.failurePoint },
      );
      await page.goto('/sync/timing');

      if (fixture.action === 'run') {
        await page.getByTestId('run-timing-fixture').click();
      } else if (fixture.action === 'reset') {
        await page.getByTestId('reset-timing-fixture').click();
      }

      await expect(page.getByTestId('timing-final-quantity')).toHaveAttribute(
        'data-result',
        'failed',
      );
      await expect(page.getByTestId('timing-result')).toHaveText(fixture.expectedMessage);
      await expect(page.getByTestId('run-timing-fixture')).toBeEnabled();
      await expect(page.getByTestId('reset-timing-fixture')).toBeEnabled();
    });
  }
});
