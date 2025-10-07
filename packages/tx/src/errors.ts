export class CompensationFailedError extends Error {
  constructor(
    message: string,
    public readonly failures: Error[],
  ) {
    super(message);
    this.name = 'CompensationFailedError';
  }
}

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly lastError: Error,
    public readonly attempts: number,
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}

export class TransactionTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = 'TransactionTimeoutError';
  }
}
