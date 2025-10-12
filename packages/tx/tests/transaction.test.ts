/* eslint-disable @typescript-eslint/require-await */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startTransaction } from '../src';
import {
  CompensationFailedError,
  RetryExhaustedError,
  TransactionTimeoutError,
} from '../src/errors';

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
    expect(gap1).toBeLessThan(70);
    expect(gap2).toBeGreaterThanOrEqual(95);
    expect(gap2).toBeLessThan(120);
  });
});

describe('Transaction - Rollback', () => {
  it('should rollback when a step fails', async () => {
    const tx = startTransaction();
    const compensate1 = vi.fn().mockResolvedValue(undefined);

    await tx.run(async () => {}, { compensate: compensate1 });

    await expect(
      tx.run(async () => {
        throw new Error('Step 2 fails');
      }),
    ).rejects.toThrow(RetryExhaustedError);

    expect(compensate1).toHaveBeenCalledTimes(1);
  });

  it('should rollback steps in reverse order', async () => {
    const tx = startTransaction();
    const order: number[] = [];

    await tx.run(async () => {}, {
      compensate: async () => {
        order.push(1);
      },
    });

    await tx.run(async () => {}, {
      compensate: async () => {
        order.push(2);
      },
    });

    await expect(
      tx.run(async () => {
        throw new Error('Fail');
      }),
    ).rejects.toThrow();

    expect(order).toEqual([2, 1]);
  });

  it('should skip steps without compensate', async () => {
    const tx = startTransaction();
    const compensate1 = vi.fn().mockResolvedValue(undefined);

    await tx.run(async () => {}, { compensate: compensate1 });
    await tx.run(async () => {});

    await expect(
      tx.run(async () => {
        throw new Error('Fail');
      }),
    ).rejects.toThrow();

    expect(compensate1).toHaveBeenCalledTimes(1);
  });

  it('should throw CompensationFailedError when compensate fails', async () => {
    const tx = startTransaction();

    await tx.run(async () => {}, {
      compensate: async () => {
        throw new Error('Compensate failed');
      },
    });

    await expect(
      tx.run(async () => {
        throw new Error('Step fails');
      }),
    ).rejects.toThrow(CompensationFailedError);
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

    await expect(tx.run(async () => {})).rejects.toThrow(
      'Cannot add step: transaction is rolled-back',
    );
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
