import type { RetryConfig } from './types';
import { DEFAULT_RETRY_CONFIG } from './types';
import { RetryExhaustedError } from './errors';
import { emitTxEvent } from './devtools';

export async function executeWithRetry<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  stepId: string,
  config?: RetryConfig,
  txId?: string,
  stepIndex?: number,
  signal?: AbortSignal,
): Promise<T> {
  const { maxAttempts, delayMs, backoff } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  const errors: Error[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(signal);
      return result;
    } catch (error) {
      errors.push(error as Error);

      if (attempt === maxAttempts) {
        throw new RetryExhaustedError(stepId, maxAttempts, errors);
      }

      const delay = calculateDelay(attempt, delayMs, backoff);

      if (txId !== undefined && stepIndex !== undefined) {
        emitTxEvent('step.retry', {
          txId,
          stepIndex,
          attempt,
          maxAttempts,
          error: error instanceof Error ? error.message : String(error),
          delay,
        });
      }

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
