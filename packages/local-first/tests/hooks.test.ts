// @vitest-environment happy-dom

import { describe, beforeEach, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { Storage } from '../src/storage';
import { defineModel, useModel } from '../src';
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
