import type { TxOptions, TxStatus, TxStep, StepOptions } from './types';
import { CompensationFailedError, TransactionTimeoutError, TransactionStateError } from './errors';
import { executeWithRetry } from './retry';

export class Transaction {
  private steps: TxStep<unknown>[] = [];
  private completedSteps = 0;
  private status: TxStatus = 'pending';
  private readonly id: string;
  private readonly options: Required<TxOptions>;
  private startTime?: number;
  private timeoutTimer?: NodeJS.Timeout;

  constructor(options: TxOptions = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.options = {
      id: this.id,
      transition: options.transition ?? false,
      timeout: options.timeout ?? 30000,
    };
  }

  async run<T = void>(fn: () => Promise<T>, options?: StepOptions): Promise<T> {
    if (this.status !== 'pending' && this.status !== 'running') {
      throw new TransactionStateError(this.status, 'add step', this.id);
    }

    this.status = 'running';

    if (!this.startTime) {
      this.startTime = Date.now();
    }

    const step: TxStep<T> = {
      id: `step-${this.steps.length}`,
      run: fn,
      compensate: options?.compensate,
      retry: options?.retry,
    };

    this.steps.push(step);

    const timeoutPromise = this.createTimeoutPromise<T>();

    try {
      const result = await Promise.race([
        executeWithRetry(fn, step.id, options?.retry),
        timeoutPromise,
      ]);
      this.completedSteps++;
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    } finally {
      this.clearTimeout();
    }
  }

  // TODO: Currently only updates state; Phase 1 will add an async task for journal cleanup.
  // eslint-disable-next-line @typescript-eslint/require-await
  async commit(): Promise<void> {
    if (this.status === 'committed') {
      return;
    }

    if (this.status !== 'pending' && this.status !== 'running') {
      throw new TransactionStateError(this.status, 'commit', this.id);
    }

    this.clearTimeout();
    this.status = 'committed';
  }

  private createTimeoutPromise<T>(): Promise<T> {
    this.clearTimeout();

    return new Promise<T>((_, reject) => {
      const elapsed = this.startTime ? Date.now() - this.startTime : 0;
      const remaining = this.options.timeout - elapsed;

      if (remaining <= 0) {
        reject(new TransactionTimeoutError(this.options.timeout, elapsed));
        return;
      }

      this.timeoutTimer = setTimeout(() => {
        const finalElapsed = this.startTime ? Date.now() - this.startTime : 0;
        reject(new TransactionTimeoutError(this.options.timeout, finalElapsed));
      }, remaining);
    });
  }

  private clearTimeout(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }
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
        throw new CompensationFailedError(errors, this.completedSteps);
      }
    };

    try {
      if (this.options.transition && 'startViewTransition' in document) {
        await document.startViewTransition(rollbackFn).finished;
      } else {
        await rollbackFn();
      }
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }
}
