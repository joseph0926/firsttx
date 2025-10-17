export abstract class TxError extends Error {
  abstract getUserMessage(): string;
  abstract getDebugInfo(): string;
  abstract isRecoverable(): boolean;
}

export class CompensationFailedError extends TxError {
  constructor(
    public readonly failures: Error[],
    public readonly completedSteps: number,
  ) {
    super('Compensation failed');
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
  constructor(
    public readonly stepId: string,
    public readonly attempts: number,
    public readonly errors: Error[], // All attempt errors
  ) {
    super(`Retry exhausted for ${stepId}`);
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
  constructor(
    public readonly timeoutMs: number,
    public readonly elapsedMs: number,
  ) {
    super(`Transaction timeout`);
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
  constructor(
    public readonly currentState: string,
    public readonly attemptedAction: string,
    public readonly transactionId: string,
  ) {
    super(TransactionStateError.formatMessage(attemptedAction, currentState));
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
