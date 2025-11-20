import type { RetryConfig } from './types';
import { DEFAULT_RETRY_CONFIG } from './types';
import { RetryExhaustedError } from './errors';
import { emitTxEvent } from './devtools';
import { abortableSleep } from './utils';

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

  const getAbortError = () => {
    if (signal?.aborted) {
      const reason = signal.reason as unknown;
      return reason instanceof Error ? reason : new Error('Aborted');
    }
    return null;
  };

  const throwIfAborted = () => {
    const abortError = getAbortError();
    if (abortError) {
      throw abortError;
    }
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      throwIfAborted();
      const result = await runWithAbort(fn, signal);
      return result;
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

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

      await abortableSleep(delay, signal);
    }
  }
  throw new Error('[FirstTx] Unexpected: retry loop ended without return or throw');
}

async function runWithAbort<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) {
    return fn(undefined);
  }

  if (signal.aborted) {
    const reason = signal.reason as unknown;
    throw reason instanceof Error ? reason : new Error('Aborted');
  }

  let aborted = false;

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      aborted = true;
      const reason = signal.reason as unknown;
      reject(reason instanceof Error ? reason : new Error('Aborted'));
    };

    signal.addEventListener('abort', onAbort, { once: true });

    fn(signal)
      .then((value) => {
        if (aborted) return;
        resolve(value);
      })
      .catch((err) => {
        if (aborted) return;
        reject(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
  });
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
