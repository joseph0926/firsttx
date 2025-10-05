import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '../src/storage';
import type { StoredModel } from '../src/types';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx');
    Storage.setInstance(undefined);
    storage = Storage.getInstance();
  });

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      const testData: StoredModel<{ count: number }> = {
        _v: 1,
        updatedAt: Date.now(),
        data: { count: 42 },
      };

      await storage.set('test-key', testData);
      const result = await storage.get<{ count: number }>('test-key');

      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const result = await storage.get('non-existent');
      expect(result).toBeNull();
    });

    it('should overwrite existing data with same key', async () => {
      const firstData: StoredModel<{ value: string }> = {
        _v: 1,
        updatedAt: 100,
        data: { value: 'first' },
      };
      const secondData: StoredModel<{ value: string }> = {
        _v: 1,
        updatedAt: 200,
        data: { value: 'second' },
      };

      await storage.set('same-key', firstData);
      await storage.set('same-key', secondData);
      const result = await storage.get<{ value: string }>('same-key');

      expect(result).toEqual(secondData);
    });
  });

  describe('delete', () => {
    it('should delete existing data', async () => {
      const testData: StoredModel<{ id: number }> = {
        _v: 1,
        updatedAt: Date.now(),
        data: { id: 123 },
      };

      await storage.set('to-delete', testData);
      await storage.delete('to-delete');
      const result = await storage.get('to-delete');

      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(storage.delete('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('isolation', () => {
    it('should maintain separate data per key', async () => {
      const data1: StoredModel<{ type: string }> = {
        _v: 1,
        updatedAt: 1000,
        data: { type: 'A' },
      };
      const data2: StoredModel<{ type: string }> = {
        _v: 1,
        updatedAt: 2000,
        data: { type: 'B' },
      };

      await storage.set('key-1', data1);
      await storage.set('key-2', data2);

      const result1 = await storage.get<{ type: string }>('key-1');
      const result2 = await storage.get<{ type: string }>('key-2');

      expect(result1?.data.type).toBe('A');
      expect(result2?.data.type).toBe('B');
    });
  });
});
