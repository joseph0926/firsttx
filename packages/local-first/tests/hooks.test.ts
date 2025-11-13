// @vitest-environment happy-dom

import { describe, beforeEach, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { Storage } from '../src/storage';
import { defineModel, useModel, useSyncedModel } from '../src';
import { act, renderHook, waitFor } from '@testing-library/react';

describe('useModel', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  it('should return data when model has stored value', async () => {
    const TestModel = defineModel('test', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    await TestModel.replace({ count: 42 });

    const { result } = renderHook(() => useModel(TestModel));

    await waitFor(() => {
      const [state] = result.current;
      expect(state).toEqual({ count: 42 });
    });
  });

  it('should return null when no data exists', async () => {
    const TestModel = defineModel('empty', {
      schema: z.object({ value: z.string() }),
      ttl: 5000,
    });

    const { result } = renderHook(() => useModel(TestModel));

    await waitFor(() => {
      const [state, , history] = result.current;
      expect(state).toBeNull();
      expect(history).toStrictEqual({
        updatedAt: 0,
        age: Infinity,
        isStale: true,
        isConflicted: false,
      });
    });
  });

  it('should handle getHistory error in useEffect', async () => {
    const TestModel = defineModel('test', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    const getSpy = vi
      .spyOn(Storage.prototype, 'get')
      .mockRejectedValueOnce(new Error('IndexedDB blocked'));

    const { result } = renderHook(() => useModel(TestModel));

    await waitFor(() => {
      const [, , history] = result.current;
      expect(history).toEqual({
        updatedAt: 0,
        age: Infinity,
        isStale: true,
        isConflicted: false,
      });
    });

    expect(getSpy).toHaveBeenCalled();
    getSpy.mockRestore();
  });

  it('should handle race condition with multiple patches', async () => {
    const TestModel = defineModel('counter', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    await TestModel.replace({ count: 0 });

    const { result } = renderHook(() => useModel(TestModel));

    await waitFor(() => {
      expect(result.current[0]).toEqual({ count: 0 });
    });

    await act(async () => {
      await Promise.all([
        result.current[1]((draft) => {
          draft.count = 1;
        }),
        result.current[1]((draft) => {
          draft.count = 2;
        }),
        result.current[1]((draft) => {
          draft.count = 3;
        }),
      ]);
    });

    await waitFor(() => {
      expect(result.current[0]).toEqual({ count: 3 });
    });

    const [, , history] = result.current;
    expect(history.updatedAt).toBeGreaterThan(0);
    expect(history.isStale).toBe(false);
  });

  it('should use initialData when version is set', async () => {
    const TestModel = defineModel('versioned', {
      version: 1,
      initialData: { items: [] },
      schema: z.object({ items: z.array(z.string()) }),
      ttl: 5000,
    });

    const { result } = renderHook(() => useModel(TestModel));
    expect(result.current[0]).toBeNull();

    await act(async () => {
      await result.current[1]((draft) => {
        draft.items.push('first');
      });
    });

    await waitFor(() => {
      expect(result.current[0]).toEqual({ items: ['first'] });
    });
  });

  it('should reset to initialData when version changes', async () => {
    const TestModelV1 = defineModel('versioned-model', {
      version: 1,
      initialData: { value: 'v1' },
      schema: z.object({ value: z.string() }),
      ttl: 5000,
    });

    await TestModelV1.replace({ value: 'old-data' });

    const TestModelV2 = defineModel('versioned-model', {
      version: 2,
      initialData: { value: 'v2' },
      schema: z.object({ value: z.string() }),
      ttl: 5000,
    });

    const { result } = renderHook(() => useModel(TestModelV2));

    await waitFor(() => {
      expect(result.current[0]).toEqual({ value: 'v2' });
    });
  });

  it('should handle patch during unmount gracefully', async () => {
    const TestModel = defineModel('unmount-test', {
      schema: z.object({ count: z.number() }),
      ttl: 5000,
    });

    await TestModel.replace({ count: 0 });

    const { result, unmount } = renderHook(() => useModel(TestModel));

    await waitFor(() => {
      expect(result.current[0]).toEqual({ count: 0 });
    });

    const patchPromise = result.current[1]((draft) => {
      draft.count = 99;
    });

    unmount();

    await expect(patchPromise).resolves.toBeUndefined();

    const stored = await Storage.getInstance().get('unmount-test');
    expect(stored?.data).toEqual({ count: 99 });
  });
});

describe('useSyncedModel', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  describe('Basic Functionality', () => {
    it('should return initial null state', () => {
      const TestModel = defineModel('basic-test', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'test' });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      expect(result.current.data).toBeNull();
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should sync data from fetcher when sync() is called', async () => {
      const TestModel = defineModel('sync-basic', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'fetched' });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ value: 'fetched' });
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(result.current.isSyncing).toBe(false);
      });
    });

    it('should pass current data to fetcher', async () => {
      const TestModel = defineModel('sync-with-current', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      await TestModel.replace({ count: 5 });

      const fetcher = vi.fn().mockImplementation((current) => {
        // eslint-disable-next-line
        return Promise.resolve({ count: (current?.count || 0) + 1 });
      });

      // syncOnMount: 'never' to prevent auto-sync on mount
      const { result } = renderHook(() =>
        useSyncedModel(TestModel, fetcher, { syncOnMount: 'never' }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({ count: 5 });
      });

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledWith({ count: 5 });
        expect(result.current.data).toEqual({ count: 6 });
      });
    });

    it('should update history after sync', async () => {
      const TestModel = defineModel('sync-history', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'synced' });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(result.current.history.updatedAt).toBeGreaterThan(0);
        expect(result.current.history.isStale).toBe(false);
      });
    });
  });

  describe('SyncOnMount', () => {
    it('should sync on mount when data is stale (default behavior)', async () => {
      const TestModel = defineModel('sync-on-mount-stale', {
        schema: z.object({ value: z.string() }),
        ttl: 100,
      });

      const storage = Storage.getInstance();
      await storage.set('sync-on-mount-stale', {
        _v: 1,
        updatedAt: Date.now() - 150,
        data: { value: 'old' },
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'new' });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await waitFor(
        () => {
          expect(fetcher).toHaveBeenCalled();
          expect(result.current.data).toEqual({ value: 'new' });
        },
        { timeout: 3000 },
      );
    });

    it('should sync on mount even when data is fresh (default behavior: always)', async () => {
      const TestModel = defineModel('sync-on-mount-fresh', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      await TestModel.replace({ value: 'fresh' });

      const fetcher = vi.fn().mockResolvedValue({ value: 'new' });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await waitFor(() => {
        expect(result.current.data).toEqual({ value: 'new' });
      });

      expect(fetcher).toHaveBeenCalled();
    });

    it('should always sync on mount when syncOnMount: "always"', async () => {
      const TestModel = defineModel('sync-on-mount-always', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      await TestModel.replace({ value: 'fresh' });

      const fetcher = vi.fn().mockResolvedValue({ value: 'newer' });

      const { result } = renderHook(() =>
        useSyncedModel(TestModel, fetcher, { syncOnMount: 'always' }),
      );

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalled();
        expect(result.current.data).toEqual({ value: 'newer' });
      });
    });

    it('should never sync on mount when syncOnMount: "never"', async () => {
      const TestModel = defineModel('sync-on-mount-never', {
        schema: z.object({ value: z.string() }),
        ttl: 100,
      });

      const storage = Storage.getInstance();
      await storage.set('sync-on-mount-never', {
        _v: 1,
        updatedAt: Date.now() - 150,
        data: { value: 'old' },
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'new' });

      const { result } = renderHook(() =>
        useSyncedModel(TestModel, fetcher, { syncOnMount: 'never' }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({ value: 'old' });
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should NOT trigger multiple syncs on mount', async () => {
      const TestModel = defineModel('sync-on-mount-debounce', {
        schema: z.object({ value: z.string() }),
        ttl: 100,
      });

      const storage = Storage.getInstance();
      await storage.set('sync-on-mount-debounce', {
        _v: 1,
        updatedAt: Date.now() - 150,
        data: { value: 'old' },
      });

      let resolveCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++;
            resolve({ value: `sync-${resolveCount}` });
          }, 100);
        });
      });

      renderHook(() => useSyncedModel(TestModel, fetcher));

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Management', () => {
    it('should set isSyncing to true during sync', async () => {
      const TestModel = defineModel('syncing-state', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ value: 'done' }), 100);
        });
      });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      expect(result.current.isSyncing).toBe(false);

      act(() => {
        void result.current.sync();
      });

      expect(result.current.isSyncing).toBe(true);

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
        expect(result.current.data).toEqual({ value: 'done' });
      });
    });

    it('should maintain patch functionality', async () => {
      const TestModel = defineModel('patch-test', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ count: 10 });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ count: 10 });
      });

      await act(async () => {
        await result.current.patch((draft) => {
          draft.count = 20;
        });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ count: 20 });
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error state when sync fails', async () => {
      const TestModel = defineModel('sync-error', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const testError = new Error('Network error');
      const fetcher = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        try {
          await result.current.sync();
        } catch (e) {
          console.log(e);
        }
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(testError);
        expect(result.current.isSyncing).toBe(false);
        expect(result.current.data).toBeNull();
      });
    });

    it('should call onError callback when sync fails', async () => {
      const TestModel = defineModel('sync-error-callback', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const testError = new Error('Fetch failed');
      const fetcher = vi.fn().mockRejectedValue(testError);
      const onError = vi.fn();

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher, { onError }));

      await act(async () => {
        try {
          await result.current.sync();
        } catch (e) {
          console.log(e);
        }
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(testError);
      });
    });

    it('should log error in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestModel = defineModel('error-log', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        try {
          await result.current.sync();
        } catch (e) {
          console.log(e);
        }
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[FirstTx] Sync failed'),
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should NOT log error in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestModel = defineModel('error-no-log', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        try {
          await result.current.sync();
        } catch (e) {
          console.log(e);
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback after successful sync', async () => {
      const TestModel = defineModel('success-callback', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'success' });
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher, { onSuccess }));

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ value: 'success' });
      });
    });

    it('should NOT call onSuccess when sync fails', async () => {
      const TestModel = defineModel('no-success-on-error', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockRejectedValue(new Error('Fail'));
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useSyncedModel(TestModel, fetcher, { onSuccess, onError }),
      );

      await act(async () => {
        try {
          await result.current.sync();
        } catch (e) {
          console.log(e);
        }
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent sync calls', async () => {
      const TestModel = defineModel('concurrent-sync', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      let syncCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            syncCount++;
            resolve({ count: syncCount });
          }, 50);
        });
      });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        const promises = [result.current.sync(), result.current.sync(), result.current.sync()];

        await Promise.all(promises);
      });

      expect(fetcher).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(result.current.data?.count).toBe(1);
      });
    });

    it('should handle sync during unmount gracefully', async () => {
      const TestModel = defineModel('unmount-sync', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockImplementation(() => {
        console.log('[FETCHER] 시작');
        return new Promise((resolve) => {
          setTimeout(() => {
            console.log('[FETCHER] 완료');
            resolve({ value: 'done' });
          }, 100);
        });
      });

      const { result, unmount } = renderHook(() =>
        useSyncedModel(TestModel, fetcher, { syncOnMount: 'never' }),
      );

      const syncPromise = result.current.sync();
      unmount();

      await expect(syncPromise).resolves.toBeUndefined();
      const stored = await Storage.getInstance().get('unmount-sync');
      expect(stored?.data).toEqual({ value: 'done' });
    });

    it('should handle validation error from fetcher', async () => {
      const TestModel = defineModel('validation-error', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ count: 'invalid' });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        try {
          await result.current.sync();
        } catch (e) {
          console.log(e);
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.data).toBeNull();
      });
    });

    it('should handle ViewTransition polyfill (no native support)', async () => {
      const TestModel = defineModel('no-view-transition', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ value: 'test' });

      // eslint-disable-next-line
      const originalStartViewTransition = document.startViewTransition;

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ value: 'test' });
      });

      if (originalStartViewTransition) {
        document.startViewTransition = originalStartViewTransition;
      }
    });

    it('should handle model with initialData', async () => {
      const TestModel = defineModel('with-initial', {
        version: 1,
        initialData: { items: [] },
        schema: z.object({ items: z.array(z.string()) }),
        ttl: 5000,
      });

      const fetcher = vi.fn().mockResolvedValue({ items: ['a', 'b'] });

      const { result } = renderHook(() => useSyncedModel(TestModel, fetcher));

      expect(result.current.data).toBeNull();

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ items: ['a', 'b'] });
      });
    });

    it('should not trigger sync from history changes after mount', async () => {
      const TestModel = defineModel('no-history-trigger', {
        schema: z.object({ value: z.string() }),
        ttl: 50,
      });

      await TestModel.replace({ value: 'initial' });

      const fetcher = vi.fn().mockResolvedValue({ value: 'new' });

      // syncOnMount: 'never' to prevent auto-sync on mount
      renderHook(() => useSyncedModel(TestModel, fetcher, { syncOnMount: 'never' }));

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetcher).not.toHaveBeenCalled();
    });
  });
});
