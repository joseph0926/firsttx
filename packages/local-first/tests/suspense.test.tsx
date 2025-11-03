// @vitest-environment happy-dom

import { describe, beforeEach, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { Storage } from '../src/storage';
import { defineModel } from '../src';

describe('Model.getSyncPromise', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  it('should return cached data as resolved promise', async () => {
    const TestModel = defineModel('test-cached', {
      schema: z.object({ value: z.string() }),
      ttl: 5000,
    });

    await TestModel.replace({ value: 'cached' });

    // eslint-disable-next-line
    const fetcher = vi.fn(async () => ({ value: 'fetched' }));

    const promise = TestModel.getSyncPromise(fetcher);
    const data = await promise;

    expect(data).toEqual({ value: 'cached' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should fetch data when no cache exists', async () => {
    const TestModel = defineModel('test-fetch', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    // eslint-disable-next-line
    const fetcher = vi.fn(async () => ({ count: 42 }));

    const promise = TestModel.getSyncPromise(fetcher);
    const data = await promise;

    expect(data).toEqual({ count: 42 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should reuse same promise on concurrent calls', async () => {
    const TestModel = defineModel('test-concurrent', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    let callCount = 0;
    const fetcher = vi.fn(async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { count: callCount };
    });

    const promise1 = TestModel.getSyncPromise(fetcher);
    const promise2 = TestModel.getSyncPromise(fetcher);
    const promise3 = TestModel.getSyncPromise(fetcher);

    expect(promise1).toBe(promise2);
    expect(promise2).toBe(promise3);

    const [data1, data2, data3] = await Promise.all([promise1, promise2, promise3]);

    expect(data1).toEqual({ count: 1 });
    expect(data2).toEqual({ count: 1 });
    expect(data3).toEqual({ count: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should clear promise after completion', async () => {
    const TestModel = defineModel('test-clear', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    // eslint-disable-next-line
    const fetcher = vi.fn(async () => ({ count: 1 }));

    const promise1 = TestModel.getSyncPromise(fetcher);
    await promise1;

    await TestModel.replace({ count: 999 });

    const promise2 = TestModel.getSyncPromise(fetcher);
    const data = await promise2;

    expect(data).toEqual({ count: 999 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    const TestModel = defineModel('test-error', {
      schema: z.object({ data: z.string() }),
      ttl: 5000,
    });

    // eslint-disable-next-line
    const fetcher = vi.fn(async () => {
      throw new Error('Fetch failed');
    });

    const promise = TestModel.getSyncPromise(fetcher);

    await expect(promise).rejects.toThrow('Fetch failed');
  });

  it('should clear promise after error', async () => {
    const TestModel = defineModel('test-error-clear', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    let shouldFail = true;
    // eslint-disable-next-line
    const fetcher = vi.fn(async () => {
      if (shouldFail) {
        throw new Error('First attempt failed');
      }
      return { count: 42 };
    });

    const promise1 = TestModel.getSyncPromise(fetcher);
    await expect(promise1).rejects.toThrow('First attempt failed');

    shouldFail = false;
    const promise2 = TestModel.getSyncPromise(fetcher);
    const data = await promise2;

    expect(data).toEqual({ count: 42 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should return same Promise instance for cached data across multiple calls', async () => {
    const TestModel = defineModel('test-stable-promise', {
      schema: z.object({ value: z.string() }),
      ttl: 5000,
    });

    await TestModel.replace({ value: 'stable' });

    // eslint-disable-next-line
    const fetcher = vi.fn(async () => ({ value: 'new' }));

    const promise1 = TestModel.getSyncPromise(fetcher);
    const promise2 = TestModel.getSyncPromise(fetcher);
    const promise3 = TestModel.getSyncPromise(fetcher);

    expect(promise1).toBe(promise2);
    expect(promise2).toBe(promise3);

    const data = await promise1;
    expect(data).toEqual({ value: 'stable' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should invalidate cached Promise when data changes', async () => {
    const TestModel = defineModel('test-invalidate', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    await TestModel.replace({ count: 1 });

    // eslint-disable-next-line
    const fetcher = vi.fn(async () => ({ count: 999 }));

    const promise1 = TestModel.getSyncPromise(fetcher);
    const data1 = await promise1;
    expect(data1).toEqual({ count: 1 });

    await TestModel.replace({ count: 2 });

    const promise2 = TestModel.getSyncPromise(fetcher);
    expect(promise1).not.toBe(promise2);

    const data2 = await promise2;
    expect(data2).toEqual({ count: 2 });
  });
});
