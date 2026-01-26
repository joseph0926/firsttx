import type { TxOptions, TxStatus, TxStep, StepOptions } from './types';
import { CompensationFailedError, TransactionTimeoutError, TransactionStateError } from './errors';
import { executeWithRetry } from './retry';
import { emitTxEvent } from './devtools';
import { supportsViewTransition } from './utils';

export class Transaction {
  private steps: TxStep<unknown>[] = [];
  private completedSteps = 0;
  private status: TxStatus = 'pending';
  private isStepRunning = false;
  private readonly id: string;
  private readonly options: Required<TxOptions>;
  private startTime?: number;
  private timeoutTimer?: NodeJS.Timeout;
  private abortController?: AbortController;

  constructor(options: TxOptions = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.options = {
      id: this.id,
      transition: options.transition ?? false,
      timeout: options.timeout ?? 30000,
    };

    emitTxEvent('start', {
      txId: this.id,
      hasTimeout: this.options.timeout !== undefined,
      timeout: this.options.timeout,
      hasTransition: this.options.transition,
    });
  }

  async run<T = void>(fn: (signal?: AbortSignal) => Promise<T>, options?: StepOptions): Promise<T> {
    if (this.status !== 'pending' && this.status !== 'running') {
      throw new TransactionStateError(this.status, 'add step', this.id);
    }

    if (this.isStepRunning) {
      throw new TransactionStateError(this.status, 'add step', this.id);
    }

    this.status = 'running';
    this.isStepRunning = true;

    if (!this.startTime) {
      this.startTime = Date.now();
    }

    this.abortController = new AbortController();
    const externalSignal = options?.signal;
    const onExternalAbort = () => {
      if (!this.abortController || this.abortController.signal.aborted) return;
      const reason: unknown = externalSignal?.reason;
      const abortError = reason instanceof Error ? reason : new Error('Aborted');
      this.abortController.abort(abortError);
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        onExternalAbort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    const stepIndex = this.steps.length;
    const step: TxStep<T> = {
      id: `step-${stepIndex}`,
      run: fn,
      compensate: options?.compensate,
      retry: options?.retry,
    };

    this.steps.push(step);

    emitTxEvent('step.start', {
      txId: this.id,
      stepIndex,
      hasCompensate: step.compensate !== undefined,
      hasRetry: step.retry !== undefined,
      maxAttempts: step.retry?.maxAttempts,
    });

    const timeoutPromise = this.createTimeoutPromise<T>();
    const stepStartTime = Date.now();

    try {
      const result = await Promise.race([
        executeWithRetry(
          fn,
          step.id,
          options?.retry,
          this.id,
          stepIndex,
          this.abortController.signal,
        ),
        timeoutPromise,
      ]);

      const duration = Date.now() - stepStartTime;
      this.completedSteps++;

      emitTxEvent('step.success', {
        txId: this.id,
        stepIndex,
        duration,
        attempt: options?.retry?.maxAttempts || 1,
      });

      return result;
    } catch (error) {
      emitTxEvent('step.fail', {
        txId: this.id,
        stepIndex,
        error: error instanceof Error ? error.message : String(error),
        finalAttempt: options?.retry?.maxAttempts || 1,
      });

      await this.rollback(stepIndex, error as Error);
      throw error;
    } finally {
      this.clearTimeout();
      this.abortController = undefined;
      this.isStepRunning = false;
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  // eslint-disable-next-line
  async commit(): Promise<void> {
    if (this.status === 'committed') {
      return;
    }

    if (this.status !== 'pending' && this.status !== 'running') {
      throw new TransactionStateError(this.status, 'commit', this.id);
    }

    this.clearTimeout();
    this.status = 'committed';

    const duration = this.startTime ? Date.now() - this.startTime : 0;

    emitTxEvent('commit', {
      txId: this.id,
      totalSteps: this.steps.length,
      duration,
    });
  }

  private createTimeoutPromise<T>(): Promise<T> {
    this.clearTimeout();

    return new Promise<T>((_, reject) => {
      const elapsed = this.startTime ? Date.now() - this.startTime : 0;
      const remaining = this.options.timeout - elapsed;

      if (remaining <= 0) {
        if (this.abortController) {
          const timeoutError = new TransactionTimeoutError(this.options.timeout, elapsed);
          this.abortController.abort(timeoutError);
        }

        emitTxEvent('timeout', {
          txId: this.id,
          timeoutMs: this.options.timeout,
          elapsedMs: elapsed,
          completedSteps: this.completedSteps,
        });
        reject(new TransactionTimeoutError(this.options.timeout, elapsed));
        return;
      }

      this.timeoutTimer = setTimeout(() => {
        const finalElapsed = this.startTime ? Date.now() - this.startTime : 0;

        if (this.abortController) {
          const timeoutError = new TransactionTimeoutError(this.options.timeout, finalElapsed);
          this.abortController.abort(timeoutError);
        }

        emitTxEvent('timeout', {
          txId: this.id,
          timeoutMs: this.options.timeout,
          elapsedMs: finalElapsed,
          completedSteps: this.completedSteps,
        });

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

  private async rollback(failedStepIndex: number, error: Error): Promise<void> {
    emitTxEvent('rollback.start', {
      txId: this.id,
      failedStepIndex,
      error: error.message,
      stepsToCompensate: this.completedSteps,
    });

    this.status = 'rolled-back';
    const rollbackStartTime = Date.now();

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
        emitTxEvent('rollback.fail', {
          txId: this.id,
          failedCompensations: errors.length,
          errors: errors.map((e) => e.message),
        });

        throw new CompensationFailedError(errors, this.completedSteps);
      }

      const duration = Date.now() - rollbackStartTime;
      emitTxEvent('rollback.success', {
        txId: this.id,
        compensatedSteps: this.completedSteps,
        duration,
      });
    };

    try {
      if (this.options.transition && supportsViewTransition()) {
        await document.startViewTransition(rollbackFn).finished;
      } else {
        await rollbackFn();
      }
    } catch (rollbackError) {
      this.status = 'failed';
      throw rollbackError;
    }
  }
}
