import type { RetryConfig } from './types';
import { DEFAULT_RETRY_CONFIG } from './types';
import { RetryExhaustedError } from './errors';

export async function executeWithRetry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T> {
  const { maxAttempts, delayMs, backoff } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw new RetryExhaustedError(
          `[FirstTx] Failed after ${maxAttempts} attempt(s)`,
          lastError,
          maxAttempts,
        );
      }

      const delay = calculateDelay(attempt, delayMs, backoff);
      await sleep(delay);
    }
  }
  throw new Error('[FirstTx] Unexpected: retry loop ended without return or throw');
}

function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  backoff: 'linear' | 'exponential',
): number {
  if (backoff === 'linear') {
    return baseDelayMs * attempt;
  } else {
    return baseDelayMs * Math.pow(2, attempt - 1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
