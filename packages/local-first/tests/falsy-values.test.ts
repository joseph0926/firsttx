import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { defineModel } from '../src/model';
import { Storage } from '../src/storage';

async function seed<T>(key: string, data: T, _v = 1): Promise<void> {
  await Storage.getInstance().set(key, { _v, updatedAt: Date.now(), data });
}

async function until(predicate: () => boolean, timeout = 2000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('condition not met within timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('falsy primitive values', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  describe('subscribe - stored falsy data is restored', () => {
    it('should restore stored 0 instead of falling back to initialData', async () => {
      await seed('falsy-zero', 0);

      const TestModel = defineModel('falsy-zero', {
        schema: z.number(),
        initialData: 7,
        ttl: 5000,
      });

      TestModel.subscribe(() => {});

      await until(() => TestModel.getCachedSnapshot() === 0);
      expect(TestModel.getCachedSnapshot()).toBe(0);
      expect(await TestModel.getSnapshot()).toBe(0);
    });

    it('should restore stored empty string instead of falling back to initialData', async () => {
      await seed('falsy-empty', '');

      const TestModel = defineModel('falsy-empty', {
        schema: z.string(),
        initialData: 'fallback',
        ttl: 5000,
      });

      TestModel.subscribe(() => {});

      await until(() => TestModel.getCachedSnapshot() === '');
      expect(TestModel.getCachedSnapshot()).toBe('');
      expect(await TestModel.getSnapshot()).toBe('');
    });
  });

  describe('version reset - falsy initialData is used', () => {
    it('should seed 0 after a version bump wipes stored data', async () => {
      await seed('ver-reset-zero', 5, 1);

      const TestModel = defineModel('ver-reset-zero', {
        schema: z.number(),
        version: 2,
        initialData: 0,
        ttl: 5000,
      });

      expect(await TestModel.getSnapshot()).toBe(0);

      const history = await TestModel.getHistory();
      expect(history.isStale).toBe(false);
    });

    it('should seed empty string after a version bump wipes stored data', async () => {
      await seed('ver-reset-empty', 'old', 1);

      const TestModel = defineModel('ver-reset-empty', {
        schema: z.string(),
        version: 2,
        initialData: '',
        ttl: 5000,
      });

      expect(await TestModel.getSnapshot()).toBe('');
    });
  });

  describe('version option itself', () => {
    it('should treat version 0 as a real version and reset mismatched data', async () => {
      await seed('ver-zero', 'stale', 1);

      const TestModel = defineModel('ver-zero', {
        schema: z.string(),
        version: 0,
        initialData: 'fresh',
        ttl: 5000,
      });

      expect(await TestModel.getSnapshot()).toBe('fresh');
    });

    it('should not reset data that already matches version 0', async () => {
      await seed('ver-zero-match', 'kept', 0);

      const TestModel = defineModel('ver-zero-match', {
        schema: z.string(),
        version: 0,
        initialData: 'fresh',
        ttl: 5000,
      });

      expect(await TestModel.getSnapshot()).toBe('kept');
    });
  });

  describe('patch - falsy initialData counts as provided', () => {
    it('should not throw "no initialData provided" when initialData is 0', async () => {
      const TestModel = defineModel('patch-zero', {
        schema: z.number(),
        initialData: 0,
        ttl: 5000,
      });

      await expect(TestModel.patch(() => {})).resolves.toBeUndefined();
      expect(await TestModel.getSnapshot()).toBe(0);
    });

    it('should not throw "no initialData provided" when initialData is an empty string', async () => {
      const TestModel = defineModel('patch-empty', {
        schema: z.string(),
        initialData: '',
        ttl: 5000,
      });

      await expect(TestModel.patch(() => {})).resolves.toBeUndefined();
      expect(await TestModel.getSnapshot()).toBe('');
    });

    it('should still throw when initialData is genuinely absent', async () => {
      const TestModel = defineModel('patch-absent', {
        schema: z.number(),
        ttl: 5000,
      });

      await expect(TestModel.patch(() => {})).rejects.toThrow('no initialData provided');
    });
  });

  describe('getSyncPromise - cached falsy value is a cache hit', () => {
    it('should resolve cached 0 without invoking the fetcher', async () => {
      const TestModel = defineModel('sync-zero', {
        schema: z.number(),
        ttl: 5000,
      });

      await TestModel.replace(0);

      const fetcher = vi.fn().mockResolvedValue(1);
      await expect(TestModel.getSyncPromise(fetcher)).resolves.toBe(0);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should resolve cached empty string without invoking the fetcher', async () => {
      const TestModel = defineModel('sync-empty', {
        schema: z.string(),
        ttl: 5000,
      });

      await TestModel.replace('');

      const fetcher = vi.fn().mockResolvedValue('server');
      await expect(TestModel.getSyncPromise(fetcher)).resolves.toBe('');

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(fetcher).not.toHaveBeenCalled();
    });
  });
});
