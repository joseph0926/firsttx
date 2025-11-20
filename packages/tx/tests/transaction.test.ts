/* eslint-disable @typescript-eslint/require-await */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startTransaction } from '../src';
import {
  CompensationFailedError,
  RetryExhaustedError,
  TransactionTimeoutError,
  TransactionStateError,
} from '../src/errors';
import { abortableSleep } from '../src/utils';

describe('Transaction - Basic', () => {
  it('should create a transaction', () => {
    const tx = startTransaction();
    expect(tx).toBeDefined();
  });

  it('should create transaction with custom id', () => {
    const tx = startTransaction({ id: 'my-tx' });
    expect(tx).toBeDefined();
  });

  it('should execute a single step successfully', async () => {
    const tx = startTransaction();
    const fn = vi.fn().mockResolvedValue(undefined);

    await tx.run(fn);
    await tx.commit();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should execute multiple steps in order', async () => {
    const tx = startTransaction();
    const order: number[] = [];

    await tx.run(async () => {
      order.push(1);
    });
    await tx.run(async () => {
      order.push(2);
    });
    await tx.run(async () => {
      order.push(3);
    });
    await tx.commit();

    expect(order).toEqual([1, 2, 3]);
  });

  it('should be idempotent on multiple commits', async () => {
    const tx = startTransaction();
    await tx.run(async () => {});

    await tx.commit();
    await tx.commit();
    await tx.commit();

    expect(true).toBe(true);
  });
});

describe('Transaction - Retry', () => {
  it('should retry and succeed on second attempt', async () => {
    const tx = startTransaction();
    let attempt = 0;

    await tx.run(
      async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('First attempt fails');
        }
      },
      { retry: { maxAttempts: 2 } },
    );

    await tx.commit();
    expect(attempt).toBe(2);
  });

  it('should throw RetryExhaustedError after all attempts fail', async () => {
    const tx = startTransaction();
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(tx.run(fn, { retry: { maxAttempts: 3 } })).rejects.toThrow(RetryExhaustedError);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should include all attempt errors in RetryExhaustedError', async () => {
    const tx = startTransaction();
    let attempt = 0;

    try {
      await tx.run(
        async () => {
          attempt++;
          throw new Error(`Attempt ${attempt} failed`);
        },
        { retry: { maxAttempts: 3 } },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(RetryExhaustedError);
      const retryError = error as RetryExhaustedError;

      expect(retryError.attempts).toBe(3);
      expect(retryError.errors).toHaveLength(3);
      expect(retryError.errors[0].message).toBe('Attempt 1 failed');
      expect(retryError.errors[1].message).toBe('Attempt 2 failed');
      expect(retryError.errors[2].message).toBe('Attempt 3 failed');
      expect(retryError.stepId).toMatch(/^step-\d+$/);
    }
  });

  it('should provide user-friendly message', async () => {
    const tx = startTransaction();

    try {
      await tx.run(
        async () => {
          throw new Error('Network error');
        },
        { retry: { maxAttempts: 3 } },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(RetryExhaustedError);
      const retryError = error as RetryExhaustedError;

      expect(retryError.getUserMessage()).toBe(
        'The operation failed after 3 attempts. Please try again later.',
      );
      expect(retryError.getDebugInfo()).toContain('step-0');
      expect(retryError.getDebugInfo()).toContain('Attempt 1/3');
      expect(retryError.isRecoverable()).toBe(true);
    }
  });

  it('should use default retry config (1 attempt)', async () => {
    const tx = startTransaction();
    const fn = vi.fn().mockRejectedValue(new Error('Fails'));

    await expect(tx.run(fn)).rejects.toThrow(RetryExhaustedError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should wait with exponential backoff', async () => {
    const tx = startTransaction();
    const timestamps: number[] = [];

    await expect(
      tx.run(
        async () => {
          timestamps.push(Date.now());
          throw new Error('Fail');
        },
        {
          retry: {
            maxAttempts: 3,
            delayMs: 50,
            backoff: 'exponential',
          },
        },
      ),
    ).rejects.toThrow();

    const gap1 = timestamps[1] - timestamps[0];
    const gap2 = timestamps[2] - timestamps[1];

    expect(gap1).toBeGreaterThanOrEqual(45);
    expect(gap2).toBeGreaterThanOrEqual(90);
  });

  it('should handle retry with compensate', async () => {
    const tx = startTransaction();
    let attempt = 0;

    await tx.run(async () => {}, {
      compensate: async () => {},
    });

    await expect(
      tx.run(
        async () => {
          attempt++;
          throw new Error('Always fails');
        },
        {
          retry: { maxAttempts: 2 },
          compensate: async () => {},
        },
      ),
    ).rejects.toThrow(RetryExhaustedError);

    expect(attempt).toBe(2);
  });
});

describe('Transaction - Timeout', () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('should complete before timeout', async () => {
    const tx = startTransaction({ timeout: 1000 });

    const fn = vi.fn().mockImplementation(async () => {
      await sleep(100);
    });

    await tx.run(fn);
    await tx.commit();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should timeout during execution', async () => {
    const tx = startTransaction({ timeout: 100 });

    const fn = vi.fn().mockImplementation(async () => {
      await sleep(300);
    });

    await expect(tx.run(fn)).rejects.toThrow(TransactionTimeoutError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should include elapsed time in timeout error', async () => {
    const tx = startTransaction({ timeout: 100 });

    try {
      await tx.run(async () => {
        await sleep(200);
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TransactionTimeoutError);
      const timeoutError = error as TransactionTimeoutError;

      expect(timeoutError.timeoutMs).toBe(100);
      expect(timeoutError.elapsedMs).toBeGreaterThanOrEqual(80);
      expect(timeoutError.elapsedMs).toBeLessThanOrEqual(120);
      expect(timeoutError.getUserMessage()).toContain('took too long');
      expect(timeoutError.getDebugInfo()).toContain('exceeded timeout');
      expect(timeoutError.isRecoverable()).toBe(true);
    }
  });

  it('should handle timeout with multiple steps', async () => {
    const tx = startTransaction({ timeout: 200 });

    await tx.run(async () => {
      await sleep(50);
    });
    await tx.run(async () => {
      await sleep(50);
    });
    await expect(
      tx.run(async () => {
        await sleep(150);
      }),
    ).rejects.toThrow(TransactionTimeoutError);
  });

  it('should rollback completed steps when timeout occurs', async () => {
    const tx = startTransaction({ timeout: 200 });
    const compensations: number[] = [];

    await tx.run(
      async () => {
        await sleep(50);
      },
      {
        compensate: async () => {
          compensations.push(1);
        },
      },
    );
    await tx.run(
      async () => {
        await sleep(50);
      },
      {
        compensate: async () => {
          compensations.push(2);
        },
      },
    );
    await expect(
      tx.run(async () => {
        await sleep(150);
      }),
    ).rejects.toThrow(TransactionTimeoutError);

    expect(compensations).toEqual([2, 1]);
  });

  it('should clear timeout on successful commit', async () => {
    const tx = startTransaction({ timeout: 150 });

    await tx.run(async () => {
      await sleep(100);
    });

    await tx.commit();

    await sleep(100);

    expect(true).toBe(true);
  });

  it('should handle immediate timeout (remaining <= 0)', async () => {
    const tx = startTransaction({ timeout: 100 });

    await tx
      .run(async () => {
        await sleep(150);
      })
      .catch(() => {});

    await expect(tx.run(async () => {})).rejects.toThrow(TransactionStateError);
  });
});

describe('Transaction - Failed Status', () => {
  it('should throw CompensationFailedError when compensation fails', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    });

    await expect(
      tx.run(async () => {
        throw new Error('Step fails');
      }),
    ).rejects.toThrow(CompensationFailedError);
  });

  it('should include completedSteps in CompensationFailedError', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Comp 1 failed');
      },
    });

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Comp 2 failed');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Trigger rollback');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CompensationFailedError);
      const compError = error as CompensationFailedError;

      expect(compError.failures).toHaveLength(2);
      expect(compError.completedSteps).toBe(2);
      expect(compError.getUserMessage()).toContain('inconsistent state');
      expect(compError.getDebugInfo()).toContain('Step 2');
      expect(compError.getDebugInfo()).toContain('Step 1');
      expect(compError.isRecoverable()).toBe(false);
    }
  });

  it('should not allow adding steps after compensation fails', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Step fails');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CompensationFailedError);
    }

    await expect(tx.run(async () => {})).rejects.toThrow(TransactionStateError);
  });

  it('should collect all compensate errors', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Error 1');
      },
    });

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Error 2');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Trigger rollback');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CompensationFailedError);
      const e = error as CompensationFailedError;
      expect(e.failures).toHaveLength(2);
      expect(e.failures[0].message).toBe('Error 2');
      expect(e.failures[1].message).toBe('Error 1');
    }
  });

  it('should not allow adding steps after rollback', async () => {
    const tx = startTransaction();

    await tx.run(async () => {});

    try {
      await tx.run(async () => {
        throw new Error('Fail');
      });
    } catch {}

    await expect(tx.run(async () => {})).rejects.toThrow(TransactionStateError);
  });

  it('should not allow adding steps after normal rollback', async () => {
    const tx = startTransaction();
    const compensate = vi.fn().mockResolvedValue(undefined);

    await tx.run(async () => {}, { compensate });

    try {
      await tx.run(async () => {
        throw new Error('Step fails');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RetryExhaustedError);
    }

    expect(compensate).toHaveBeenCalledTimes(1);

    await expect(tx.run(async () => {})).rejects.toThrow(TransactionStateError);
  });

  it('should collect all compensation errors and mark as failed', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation error 1');
      },
    });

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation error 2');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Trigger rollback');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CompensationFailedError);
      const e = error as CompensationFailedError;
      expect(e.failures).toHaveLength(2);
    }

    await expect(tx.run(async () => {})).rejects.toThrow(TransactionStateError);
  });

  it('should not allow commit after compensation fails', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Fail');
      });
    } catch {}

    await expect(tx.commit()).rejects.toThrow(TransactionStateError);
  });
});

describe('Transaction - State Errors', () => {
  it('should throw TransactionStateError when adding step after commit', async () => {
    const tx = startTransaction();
    await tx.run(async () => {});
    await tx.commit();

    try {
      await tx.run(async () => {});
    } catch (error) {
      expect(error).toBeInstanceOf(TransactionStateError);
      const stateError = error as TransactionStateError;

      expect(stateError.currentState).toBe('committed');
      expect(stateError.attemptedAction).toBe('add step');
      expect(stateError.getUserMessage()).toContain('no longer available');
      expect(stateError.getDebugInfo()).toContain('Cannot add step');
      expect(stateError.isRecoverable()).toBe(false);
    }
  });

  it('should throw TransactionStateError when committing rolled-back tx', async () => {
    const tx = startTransaction();

    try {
      await tx.run(async () => {
        throw new Error('Fail');
      });
    } catch {}

    try {
      await tx.commit();
    } catch (error) {
      expect(error).toBeInstanceOf(TransactionStateError);
      const stateError = error as TransactionStateError;

      expect(stateError.currentState).toBe('rolled-back');
      expect(stateError.attemptedAction).toBe('commit');
    }
  });

  it('should throw TransactionStateError when committing failed tx', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Fail');
      });
    } catch {}

    try {
      await tx.commit();
    } catch (error) {
      expect(error).toBeInstanceOf(TransactionStateError);
      const stateError = error as TransactionStateError;

      expect(stateError.currentState).toBe('failed');
    }
  });
});

describe('Transaction - ViewTransition', () => {
  beforeEach(() => {
    if (!('startViewTransition' in document)) {
      // eslint-disable-next-line
      (document as any).startViewTransition = vi.fn((callback) => {
        // eslint-disable-next-line
        callback();
        return { finished: Promise.resolve() };
      });
    }
  });

  it('should use ViewTransition when enabled', async () => {
    const tx = startTransaction({ transition: true });
    const spy = vi.spyOn(document, 'startViewTransition');

    await tx.run(async () => {}, {
      compensate: async () => {},
    });

    await expect(
      tx.run(async () => {
        throw new Error('Trigger rollback');
      }),
    ).rejects.toThrow();

    expect(spy).toHaveBeenCalled();
  });

  it('should work without ViewTransition when disabled', async () => {
    const tx = startTransaction({ transition: false });
    const compensate = vi.fn().mockResolvedValue(undefined);

    await tx.run(async () => {}, { compensate });

    await expect(
      tx.run(async () => {
        throw new Error('Fail');
      }),
    ).rejects.toThrow();

    expect(compensate).toHaveBeenCalled();
  });
});

describe('Transaction - Complex Scenarios', () => {
  it('should handle mixed success/failure with partial rollback', async () => {
    const tx = startTransaction();
    const results: string[] = [];

    await tx.run(
      async () => {
        results.push('step1-run');
      },
      {
        compensate: async () => {
          results.push('step1-compensate');
        },
      },
    );

    await tx.run(
      async () => {
        results.push('step2-run');
      },
      {
        compensate: async () => {
          results.push('step2-compensate');
        },
      },
    );

    await expect(
      tx.run(async () => {
        results.push('step3-run');
        throw new Error('Step 3 fails');
      }),
    ).rejects.toThrow();

    expect(results).toEqual([
      'step1-run',
      'step2-run',
      'step3-run',
      'step2-compensate',
      'step1-compensate',
    ]);
  });

  it('should handle retry with compensate', async () => {
    const tx = startTransaction();
    let attempt = 0;

    await tx.run(async () => {}, {
      compensate: async () => {},
    });

    await expect(
      tx.run(
        async () => {
          attempt++;
          throw new Error('Always fails');
        },
        {
          retry: { maxAttempts: 2 },
          compensate: async () => {},
        },
      ),
    ).rejects.toThrow(RetryExhaustedError);

    expect(attempt).toBe(2);
  });
});

describe('Transaction - Timeout', () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('should complete before timeout', async () => {
    const tx = startTransaction({ timeout: 1000 });

    const fn = vi.fn().mockImplementation(async () => {
      await sleep(100);
    });

    await tx.run(fn);
    await tx.commit();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should timeout during execution', async () => {
    const tx = startTransaction({ timeout: 100 });

    const fn = vi.fn().mockImplementation(async () => {
      await sleep(300);
    });

    await expect(tx.run(fn)).rejects.toThrow(TransactionTimeoutError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle timeout with multiple steps', async () => {
    const tx = startTransaction({ timeout: 200 });

    await tx.run(async () => {
      await sleep(50);
    });
    await tx.run(async () => {
      await sleep(50);
    });
    await expect(
      tx.run(async () => {
        await sleep(150);
      }),
    ).rejects.toThrow(TransactionTimeoutError);
  });

  it('should rollback completed steps when timeout occurs', async () => {
    const tx = startTransaction({ timeout: 200 });
    const compensations: number[] = [];

    await tx.run(
      async () => {
        await sleep(50);
      },
      {
        compensate: async () => {
          compensations.push(1);
        },
      },
    );
    await tx.run(
      async () => {
        await sleep(50);
      },
      {
        compensate: async () => {
          compensations.push(2);
        },
      },
    );
    await expect(
      tx.run(async () => {
        await sleep(150);
      }),
    ).rejects.toThrow(TransactionTimeoutError);

    expect(compensations).toEqual([2, 1]);
  });

  it('should clear timeout on successful commit', async () => {
    const tx = startTransaction({ timeout: 150 });

    await tx.run(async () => {
      await sleep(100);
    });

    await tx.commit();

    await sleep(100);

    expect(true).toBe(true);
  });

  it('should handle immediate timeout (remaining <= 0)', async () => {
    const tx = startTransaction({ timeout: 100 });

    await tx
      .run(async () => {
        await sleep(150);
      })
      .catch(() => {});
    await expect(tx.run(async () => {})).rejects.toThrow('transaction is rolled-back');
  });

  it('should cancel ongoing function after timeout when step supports abort', async () => {
    const tx = startTransaction({ timeout: 100 });
    const executionLog: string[] = [];

    const longRunningFn = vi.fn().mockImplementation(async (signal?: AbortSignal) => {
      executionLog.push('started');
      await abortableSleep(50, signal);
      executionLog.push('checkpoint-1');
      await abortableSleep(100, signal);
      executionLog.push('checkpoint-2');
      await abortableSleep(50, signal);
      executionLog.push('completed');
    });

    await expect(tx.run(longRunningFn)).rejects.toThrow(TransactionTimeoutError);

    await sleep(250);

    expect(executionLog).toEqual(['started', 'checkpoint-1']);
  });

  it('should abort API requests after timeout when request honors the signal', async () => {
    const tx = startTransaction({ timeout: 100 });
    const apiCallMade = vi.fn();
    const apiCallCompleted = vi.fn();

    const apiRequestFn = vi.fn().mockImplementation(async (signal?: AbortSignal) => {
      await abortableSleep(50, signal);
      apiCallMade();

      await abortableSleep(150, signal);

      apiCallCompleted();
      return 'api-response';
    });

    await expect(tx.run(apiRequestFn)).rejects.toThrow(TransactionTimeoutError);

    await sleep(250);

    expect(apiCallMade).toHaveBeenCalledTimes(1);
    expect(apiCallCompleted).toHaveBeenCalledTimes(0);
  });
});

describe('Transaction - Failed Status', () => {
  it('should throw CompensationFailedError when compensation fails', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    });

    await expect(
      tx.run(async () => {
        throw new Error('Step fails');
      }),
    ).rejects.toThrow(CompensationFailedError);
  });

  it('should not allow adding steps after compensation fails', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    });
    try {
      await tx.run(async () => {
        throw new Error('Step fails');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CompensationFailedError);
    }

    await expect(tx.run(async () => {})).rejects.toThrow('Cannot add step: transaction is failed');
  });

  it('should not allow adding steps after normal rollback', async () => {
    const tx = startTransaction();
    const compensate = vi.fn().mockResolvedValue(undefined);

    await tx.run(async () => {}, { compensate });

    try {
      await tx.run(async () => {
        throw new Error('Step fails');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RetryExhaustedError);
    }

    expect(compensate).toHaveBeenCalledTimes(1);

    await expect(tx.run(async () => {})).rejects.toThrow(
      'Cannot add step: transaction is rolled-back',
    );
  });

  it('should collect all compensation errors and mark as failed', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation error 1');
      },
    });

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation error 2');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Trigger rollback');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CompensationFailedError);
      const e = error as CompensationFailedError;
      expect(e.failures).toHaveLength(2);
    }

    await expect(tx.run(async () => {})).rejects.toThrow('Cannot add step: transaction is failed');
  });

  it('should not allow commit after compensation fails', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    });

    try {
      await tx.run(async () => {
        throw new Error('Fail');
      });
    } catch {}

    await expect(tx.commit()).rejects.toThrow('[FirstTx] Cannot commit failed transaction');
  });
});

describe('Transaction - AbortSignal', () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('should provide AbortSignal to the step function', async () => {
    const tx = startTransaction();
    let receivedSignal: AbortSignal | undefined;

    await tx.run(async (signal) => {
      receivedSignal = signal;
    });

    await tx.commit();

    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  it('should abort signal on timeout', async () => {
    const tx = startTransaction({ timeout: 100 });
    let signal: AbortSignal | undefined;

    const fn = vi.fn().mockImplementation(async (s?: AbortSignal) => {
      signal = s;
      await sleep(200);
    });

    await expect(tx.run(fn)).rejects.toThrow(TransactionTimeoutError);

    expect(signal).toBeDefined();
    expect(signal?.aborted).toBe(true);
  });

  it('should cancel ongoing function when AbortSignal is respected', async () => {
    const tx = startTransaction({ timeout: 100 });
    const executionLog: string[] = [];

    const abortAwareFn = vi.fn().mockImplementation(async (signal?: AbortSignal) => {
      executionLog.push('started');
      await sleep(50);
      executionLog.push('checkpoint-1');

      if (signal?.aborted) {
        executionLog.push('aborted-early');
        throw new DOMException('Aborted', 'AbortError');
      }

      await sleep(100);

      if (signal?.aborted) {
        executionLog.push('aborted-after-timeout');
        throw new DOMException('Aborted', 'AbortError');
      }

      executionLog.push('checkpoint-2');
      await sleep(50);
      executionLog.push('completed');
    });

    await expect(tx.run(abortAwareFn)).rejects.toThrow(TransactionTimeoutError);

    await sleep(250);

    expect(executionLog).toContain('started');
    expect(executionLog).toContain('checkpoint-1');
    expect(executionLog).not.toContain('checkpoint-2');
    expect(executionLog).not.toContain('completed');
  });

  it('should abort fetch requests using AbortSignal', async () => {
    const tx = startTransaction({ timeout: 100 });
    let fetchAborted = false;

    const mockFetch = vi.fn().mockImplementation(async (signal?: AbortSignal) => {
      await sleep(50);

      const promise = sleep(200);

      signal?.addEventListener('abort', () => {
        fetchAborted = true;
      });

      await promise;

      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }

      return { data: 'response' };
    });

    await expect(tx.run(mockFetch)).rejects.toThrow(TransactionTimeoutError);

    await sleep(250);

    expect(fetchAborted).toBe(true);
  });

  it('should work without AbortSignal (backward compatibility)', async () => {
    const tx = startTransaction({ timeout: 1000 });

    const oldStyleFn = vi.fn().mockImplementation(async () => {
      await sleep(50);
      return 'success';
    });

    const result = await tx.run(oldStyleFn);
    await tx.commit();

    expect(result).toBe('success');
    expect(oldStyleFn).toHaveBeenCalledTimes(1);
  });

  it('should abort signal even with retry', async () => {
    const tx = startTransaction({ timeout: 150 });
    let lastSignal: AbortSignal | undefined;

    const fn = vi.fn().mockImplementation(async (signal?: AbortSignal) => {
      lastSignal = signal;
      await sleep(100);
      throw new Error('Fail');
    });

    await expect(
      tx.run(fn, {
        retry: { maxAttempts: 3, delayMs: 50 },
      }),
    ).rejects.toThrow(TransactionTimeoutError);

    expect(lastSignal).toBeDefined();
    expect(lastSignal?.aborted).toBe(true);

    expect(fn.mock.calls.length).toBeLessThan(3);
  });
});
