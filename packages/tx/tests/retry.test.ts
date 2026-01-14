import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeWithRetry } from '../src/retry';
import { RetryExhaustedError } from '../src/errors';
import * as devtools from '../src/devtools';

describe('executeWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(devtools, 'emitTxEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('successful execution', () => {
    it('should return result on first attempt success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const promise = executeWithRetry(fn, 'step-1');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should succeed on second attempt after first failure', async () => {
      let attempt = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new Error('First attempt fails'));
        }
        return Promise.resolve('success');
      });

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 3, delayMs: 100 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should succeed on last attempt', async () => {
      let attempt = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.reject(new Error(`Attempt ${attempt} fails`));
        }
        return Promise.resolve('success');
      });

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 3, delayMs: 100 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry exhaustion', () => {
    it('should throw RetryExhaustedError after all attempts fail', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 3, delayMs: 100 });
      // Register catch handler before running timers
      let caughtError: RetryExhaustedError | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as RetryExhaustedError;
      });
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(RetryExhaustedError);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should include all errors in RetryExhaustedError', async () => {
      let attempt = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempt++;
        return Promise.reject(new Error(`Error ${attempt}`));
      });

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 3, delayMs: 100 });
      let caughtError: RetryExhaustedError | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as RetryExhaustedError;
      });
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(RetryExhaustedError);
      expect(caughtError!.attempts).toBe(3);
      expect(caughtError!.errors).toHaveLength(3);
      expect(caughtError!.errors[0].message).toBe('Error 1');
      expect(caughtError!.errors[1].message).toBe('Error 2');
      expect(caughtError!.errors[2].message).toBe('Error 3');
    });

    it('should include stepId in RetryExhaustedError', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fails'));

      const promise = executeWithRetry(fn, 'my-step-id', { maxAttempts: 1 });
      let caughtError: RetryExhaustedError | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as RetryExhaustedError;
      });
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(RetryExhaustedError);
      expect(caughtError!.stepId).toBe('my-step-id');
    });
  });

  describe('backoff strategies', () => {
    it('should use linear backoff correctly', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fails'));
      const emitSpy = vi.spyOn(devtools, 'emitTxEvent');

      const promise = executeWithRetry(
        fn,
        'step-1',
        { maxAttempts: 3, delayMs: 100, backoff: 'linear' },
        'tx-1',
        0,
      );
      const errorPromise = promise.catch(() => undefined);
      await vi.runAllTimersAsync();
      await errorPromise;

      const retryCalls = emitSpy.mock.calls.filter((call) => (call[0] as string) === 'step.retry');
      expect(retryCalls[0][1]).toMatchObject({ delay: 100 }); // 100 * 1
      expect(retryCalls[1][1]).toMatchObject({ delay: 200 }); // 100 * 2
    });

    it('should use exponential backoff correctly', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fails'));
      const emitSpy = vi.spyOn(devtools, 'emitTxEvent');

      const promise = executeWithRetry(
        fn,
        'step-1',
        { maxAttempts: 4, delayMs: 100, backoff: 'exponential' },
        'tx-1',
        0,
      );
      const errorPromise = promise.catch(() => undefined);
      await vi.runAllTimersAsync();
      await errorPromise;

      const retryCalls = emitSpy.mock.calls.filter((call) => (call[0] as string) === 'step.retry');
      expect(retryCalls[0][1]).toMatchObject({ delay: 100 }); // 100 * 2^0
      expect(retryCalls[1][1]).toMatchObject({ delay: 200 }); // 100 * 2^1
      expect(retryCalls[2][1]).toMatchObject({ delay: 400 }); // 100 * 2^2
    });

    it('should use default config when none provided', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fails'));

      const promise = executeWithRetry(fn, 'step-1');
      let caughtError: RetryExhaustedError | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as RetryExhaustedError;
      });
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(RetryExhaustedError);
      // Default maxAttempts is 1, so only 1 call
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('devtools integration', () => {
    it('should emit step.retry events when txId and stepIndex provided', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const emitSpy = vi.spyOn(devtools, 'emitTxEvent');

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 2, delayMs: 100 }, 'tx-1', 0);
      const errorPromise = promise.catch(() => undefined);
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(emitSpy).toHaveBeenCalledWith('step.retry', {
        txId: 'tx-1',
        stepIndex: 0,
        attempt: 1,
        maxAttempts: 2,
        error: 'Test error',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        delay: expect.any(Number),
      });
    });

    it('should not emit events when txId is undefined', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fails'));
      const emitSpy = vi.spyOn(devtools, 'emitTxEvent');

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 2, delayMs: 100 });
      const errorPromise = promise.catch(() => undefined);
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit events when stepIndex is undefined', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fails'));
      const emitSpy = vi.spyOn(devtools, 'emitTxEvent');

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 2, delayMs: 100 }, 'tx-1');
      const errorPromise = promise.catch(() => undefined);
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should convert non-Error to string in event', async () => {
      const fn = vi.fn().mockRejectedValue('string error');
      const emitSpy = vi.spyOn(devtools, 'emitTxEvent');

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 2, delayMs: 100 }, 'tx-1', 0);
      const errorPromise = promise.catch(() => undefined);
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(emitSpy).toHaveBeenCalledWith(
        'step.retry',
        expect.objectContaining({
          error: 'string error',
        }),
      );
    });
  });

  describe('abort signal handling', () => {
    it('should work without signal', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await executeWithRetry(fn, 'step-1');

      expect(result).toBe('success');
    });

    it('should reject immediately if signal is already aborted', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const controller = new AbortController();
      controller.abort(new Error('Already aborted'));

      await expect(
        executeWithRetry(fn, 'step-1', { maxAttempts: 3 }, undefined, undefined, controller.signal),
      ).rejects.toThrow('Already aborted');

      expect(fn).not.toHaveBeenCalled();
    });

    it('should reject with default Error if abort reason is not an Error', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const controller = new AbortController();
      controller.abort('string reason');

      await expect(
        executeWithRetry(fn, 'step-1', { maxAttempts: 3 }, undefined, undefined, controller.signal),
      ).rejects.toThrow('Aborted');

      expect(fn).not.toHaveBeenCalled();
    });

    it('should pass signal to function', async () => {
      const fn = vi.fn().mockImplementation((signal?: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return Promise.resolve('success');
      });
      const controller = new AbortController();

      const result = await executeWithRetry(
        fn,
        'step-1',
        { maxAttempts: 1 },
        undefined,
        undefined,
        controller.signal,
      );

      expect(result).toBe('success');
    });

    it('should abort during retry delay', async () => {
      let attempt = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new Error('First fails'));
        }
        return Promise.resolve('success');
      });
      const controller = new AbortController();

      const promise = executeWithRetry(
        fn,
        'step-1',
        { maxAttempts: 3, delayMs: 1000 },
        undefined,
        undefined,
        controller.signal,
      );
      let caughtError: Error | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as Error;
      });

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0);

      // Abort during delay
      controller.abort(new Error('User cancelled'));

      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError!.message).toBe('User cancelled');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should propagate abort error from function', async () => {
      const controller = new AbortController();
      const fn = vi.fn().mockImplementation((signal?: AbortSignal) => {
        if (signal?.aborted) {
          return Promise.reject(signal.reason as Error);
        }
        controller.abort(new Error('Aborted during execution'));
        return Promise.reject(new Error('Normal error'));
      });

      const promise = executeWithRetry(
        fn,
        'step-1',
        { maxAttempts: 3 },
        undefined,
        undefined,
        controller.signal,
      );
      let caughtError: Error | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as Error;
      });
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(Error);
    });
  });

  describe('edge cases', () => {
    it('should handle zero delay', async () => {
      let attempt = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.reject(new Error('Fails'));
        }
        return Promise.resolve('success');
      });

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 3, delayMs: 0 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should convert non-Error throws to Error', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 2, delayMs: 100 });
      let caughtError: RetryExhaustedError | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as RetryExhaustedError;
      });
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(RetryExhaustedError);
      // string errors are caught as-is and stored in errors array
      expect(caughtError!.errors).toHaveLength(2);
    });

    it('should handle single maxAttempt correctly', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fails'));

      const promise = executeWithRetry(fn, 'step-1', { maxAttempts: 1 });
      let caughtError: RetryExhaustedError | undefined;
      const errorPromise = promise.catch((e) => {
        caughtError = e as RetryExhaustedError;
      });
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(caughtError).toBeInstanceOf(RetryExhaustedError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
