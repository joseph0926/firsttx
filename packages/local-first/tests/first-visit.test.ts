// @vitest-environment happy-dom

import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { Storage } from '../src/storage';
import { defineModel, useSyncedModel } from '../src';
import { renderHook, waitFor } from '@testing-library/react';

describe('First Visit Scenarios (Empty IndexedDB)', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('A) Model.getHistory() on empty DB', () => {
    it('should return isStale=true when IndexedDB is completely empty', async () => {
      const TestModel = defineModel('empty-model', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const history = await TestModel.getHistory();

      expect(history).toEqual({
        updatedAt: 0,
        age: Infinity,
        isStale: true,
        isConflicted: false,
      });
    });

    it('should return isStale=true even with very long TTL', async () => {
      const TestModel = defineModel('empty-long-ttl', {
        schema: z.object({ value: z.string() }),
        ttl: 365 * 24 * 60 * 60 * 1000,
      });

      const history = await TestModel.getHistory();

      expect(history.isStale).toBe(true);
      expect(history.age).toBe(Infinity);
    });

    it('should return isStale=true with TTL=Infinity', async () => {
      const TestModel = defineModel('empty-infinite-ttl', {
        schema: z.object({ value: z.string() }),
        ttl: Infinity,
      });

      const history = await TestModel.getHistory();

      expect(history.isStale).toBe(true);
    });
  });

  describe('B) useSyncedModel with empty DB - syncOnMount behavior', () => {
    it('[CRITICAL] should auto-sync on first mount when DB is empty (default: stale)', async () => {
      const TestModel = defineModel('first-visit-default', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'fetched-data' });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      expect(result.current.data).toBeNull();
      expect(result.current.isSyncing).toBe(false);

      await waitFor(
        () => {
          expect(fetcher).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({ value: 'fetched-data' });
        expect(result.current.isSyncing).toBe(false);
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('[CRITICAL] should call fetcher with null on first visit', async () => {
      const TestModel = defineModel('first-visit-null-arg', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ count: 42 });

      renderHook(() => useSyncedModel(TestModel, fetcher));

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledWith(null);
      });
    });

    it('should NOT sync on first mount with syncOnMount="never"', async () => {
      const TestModel = defineModel('first-visit-never', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'should-not-fetch' });

      const { result } = renderHook(() =>
        useSyncedModel(TestModel, fetcher, { syncOnMount: 'never' }),
      );

      expect(result.current.data).toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
    });

    it('should always sync on first mount with syncOnMount="always"', async () => {
      const TestModel = defineModel('first-visit-always', {
        schema: z.object({ value: z.string() }),
        ttl: Infinity,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'always-fetch' });

      renderHook(() => useSyncedModel(TestModel, fetcher, { syncOnMount: 'always' }));

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('C) Edge Cases - First Visit', () => {
    it('should handle fetcher error on first visit', async () => {
      const TestModel = defineModel('first-visit-error', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockRejectedValue(new Error('Network Error'));
      const onError = vi.fn();

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher, { onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect(result.current.error?.message).toBe('Network Error');
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle validation error on first sync', async () => {
      const TestModel = defineModel('first-visit-validation', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ count: 'invalid' });
      const onError = vi.fn();

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher, { onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.data).toBeNull();
    });

    it('should NOT trigger multiple syncs on rapid remounts', async () => {
      const TestModel = defineModel('first-visit-remount', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ value: 'data' }), 100);
        });
      });

      const { unmount: unmount1 } = renderHook(() => useSyncedModel(TestModel, fetcher));
      const { unmount: unmount2 } = renderHook(() => useSyncedModel(TestModel, fetcher));
      const { result: result3 } = renderHook(() => useSyncedModel(TestModel, fetcher));

      unmount1();
      unmount2();

      await waitFor(() => {
        expect(result3.current.data).toEqual({ value: 'data' });
      });

      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(fetcher.mock.calls.length).toBeLessThanOrEqual(3);
    });
  });

  describe('D) Integration - First Visit → Subsequent Visit', () => {
    it('should transition from empty DB → synced → stale → re-synced', async () => {
      const TestModel = defineModel('lifecycle-test', {
        schema: z.object({ version: z.number() }),
        ttl: 100,
      });

      let fetchVersion = 1;
      const fetcher = vi.fn().mockImplementation(() => {
        return Promise.resolve({ version: fetchVersion });
      });

      // First mount: empty DB → fetch version 1
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useSyncedModel(TestModel, fetcher),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual({ version: 1 });
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
      unmount1();

      fetchVersion = 2;
      fetcher.mockClear();

      // Second mount: fresh cache with syncOnMount: 'stale' → no fetch (version 1 still fresh)
      const { result: result2, unmount: unmount2 } = renderHook(() =>
        useSyncedModel(TestModel, fetcher, { syncOnMount: 'stale' }),
      );

      await waitFor(() => {
        expect(result2.current.data).toEqual({ version: 1 });
      });

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(fetcher).not.toHaveBeenCalled();
      unmount2();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));
      fetchVersion = 3;
      fetcher.mockClear();

      // Third mount: stale cache → fetch version 3
      const { result: result3 } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(result3.current.data).toEqual({ version: 3 });
      });
    });
  });
});
