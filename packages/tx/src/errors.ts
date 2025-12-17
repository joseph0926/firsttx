import { BaseFirstTxError } from '@firsttx/shared';

export type TxErrorCode =
  | 'COMPENSATION_FAILED'
  | 'RETRY_EXHAUSTED'
  | 'TRANSACTION_TIMEOUT'
  | 'TRANSACTION_STATE';

export abstract class TxError extends BaseFirstTxError {
  readonly domain = 'tx' as const;
  abstract readonly code: TxErrorCode;

  abstract isRecoverable(): boolean;
}

export class CompensationFailedError extends TxError {
  readonly code = 'COMPENSATION_FAILED' as const;

  constructor(
    public readonly failures: Error[],
    public readonly completedSteps: number,
  ) {
    super('Compensation failed', {
      failureCount: failures.length,
      completedSteps,
      failures: failures.map((e) => e.message),
    });
    this.name = 'CompensationFailedError';
  }

  getUserMessage(): string {
    return 'Failed to undo changes. Your data may be in an inconsistent state. Please refresh the page.';
  }

  getDebugInfo(): string {
    const failureDetails = this.failures
      .map((e, i) => `  Step ${this.completedSteps - i}: ${e.message}`)
      .join('\n');

    return `[CompensationFailedError] ${this.failures.length} compensation(s) failed:\n${failureDetails}`;
  }

  isRecoverable(): boolean {
    return false;
  }
}

export class RetryExhaustedError extends TxError {
  readonly code = 'RETRY_EXHAUSTED' as const;

  constructor(
    public readonly stepId: string,
    public readonly attempts: number,
    public readonly errors: Error[],
  ) {
    super(`Retry exhausted for ${stepId}`, {
      stepId,
      attempts,
      errors: errors.map((e) => e.message),
    });
    this.name = 'RetryExhaustedError';
  }

  getUserMessage(): string {
    return `The operation failed after ${this.attempts} attempt${this.attempts > 1 ? 's' : ''}. Please try again later.`;
  }

  getDebugInfo(): string {
    const errorDetails = this.errors
      .map((e, i) => `  Attempt ${i + 1}/${this.attempts}: ${e.message}`)
      .join('\n');

    return `[RetryExhaustedError] Step "${this.stepId}" failed after ${this.attempts} attempts:\n${errorDetails}`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

export class TransactionTimeoutError extends TxError {
  readonly code = 'TRANSACTION_TIMEOUT' as const;

  constructor(
    public readonly timeoutMs: number,
    public readonly elapsedMs: number,
  ) {
    super('Transaction timeout', { timeoutMs, elapsedMs });
    this.name = 'TransactionTimeoutError';
  }

  getUserMessage(): string {
    return `The operation took too long (over ${this.timeoutMs}ms). Please try again.`;
  }

  getDebugInfo(): string {
    return `[TransactionTimeoutError] Transaction exceeded timeout of ${this.timeoutMs}ms (elapsed: ${this.elapsedMs}ms)`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

export class TransactionStateError extends TxError {
  readonly code = 'TRANSACTION_STATE' as const;

  constructor(
    public readonly currentState: string,
    public readonly attemptedAction: string,
    public readonly transactionId: string,
  ) {
    super(TransactionStateError.formatMessage(attemptedAction, currentState), {
      currentState,
      attemptedAction,
      transactionId,
    });
    this.name = 'TransactionStateError';
  }

  private static formatMessage(action: string, state: string): string {
    if (action === 'commit') {
      return `[FirstTx] Cannot commit ${state} transaction`;
    }
    return `Cannot add step: transaction is ${state}`;
  }

  getUserMessage(): string {
    return 'This operation is no longer available. The transaction has already completed or failed.';
  }

  getDebugInfo(): string {
    return `[TransactionStateError] Cannot ${this.attemptedAction} in state '${this.currentState}' (tx: ${this.transactionId})`;
  }

  isRecoverable(): boolean {
    return false;
  }
}
