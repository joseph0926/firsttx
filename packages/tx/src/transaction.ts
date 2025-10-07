import type { TxOptions, TxStatus, TxStep, StepOptions } from './types';
import { CompensationFailedError } from './errors';
import { executeWithRetry } from './retry';

export class Transaction {
  private steps: TxStep[] = [];
  private completedSteps = 0;
  private status: TxStatus = 'pending';
  private readonly id: string;
  private readonly options: Required<TxOptions>;

  constructor(options: TxOptions = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.options = {
      id: this.id,
      transition: options.transition ?? false,
      timeout: options.timeout ?? 30000,
    };
  }

  async run(fn: () => Promise<void>, options?: StepOptions): Promise<void> {
    if (this.status !== 'pending') {
      throw new Error(`[FirstTx] Cannot add step to ${this.status} transaction`);
    }

    this.status = 'running';

    const step: TxStep = {
      id: crypto.randomUUID(),
      run: fn,
      compensate: options?.compensate,
      retry: options?.retry,
    };
    this.steps.push(step);

    try {
      await executeWithRetry(fn, options?.retry);
      this.completedSteps++;
      this.status = 'pending';
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  // TODO: Currently only updates state; Phase 1 will add an async task for journal cleanup.
  // eslint-disable-next-line @typescript-eslint/require-await
  async commit(): Promise<void> {
    if (this.status === 'committed') {
      return;
    }

    if (this.status !== 'pending') {
      throw new Error(`[FirstTx] Cannot commit ${this.status} transaction`);
    }

    this.status = 'committed';

    // TODO Phase 1: await Storage.getInstance().delete(`tx:${this.id}`)
  }

  private async rollback(): Promise<void> {
    this.status = 'rolled-back';

    const rollbackFn = async () => {
      const errors: Error[] = [];

      for (let i = this.completedSteps - 1; i >= 0; i--) {
        const step = this.steps[i];
        if (!step.compensate) continue;

        try {
          await step.compensate();
        } catch (error) {
          errors.push(error as Error);
        }
      }

      if (errors.length > 0) {
        throw new CompensationFailedError(
          `[FirstTx] Rollback failed for ${errors.length} step(s)`,
          errors,
        );
      }
    };

    if (this.options.transition && 'startViewTransition' in document) {
      await document.startViewTransition(rollbackFn).finished;
    } else {
      await rollbackFn();
    }
  }
}
