// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '../src/storage';
import type { StoredModel } from '../src/types';
import { ValidationError } from '../src/errors';
import { defineModel } from '../src/model';
import { useModel } from '../src/hooks';
import { renderHook, waitFor } from '@testing-library/react';
import z from 'zod';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
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

  // 기존 테스트들...

  describe('useModel - Error Handling', () => {
    beforeEach(() => {
      indexedDB.deleteDatabase('firsttx-local-first');
      Storage.setInstance(undefined);
    });

    it('should expose error through useModel', async () => {
      const TestModel = defineModel('test-hook-error', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      const storage = Storage.getInstance();
      await storage.set('test-hook-error', {
        _v: 1,
        updatedAt: Date.now(),
        data: { count: 'invalid' },
      });

      const { result } = renderHook(() => useModel(TestModel));

      await waitFor(() => {
        const [state, , , error] = result.current;
        expect(state).toBeNull();
        expect(error).toBeInstanceOf(ValidationError);
      });
    });

    it('should return null error when data is valid', async () => {
      const TestModel = defineModel('test-hook-no-error', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      await TestModel.replace({ value: 'test' });

      const { result } = renderHook(() => useModel(TestModel));

      await waitFor(() => {
        const [state, , , error] = result.current;
        expect(state).toEqual({ value: 'test' });
        expect(error).toBeNull();
      });
    });

    it('should handle ValidationError with detailed info', async () => {
      const TestModel = defineModel('test-hook-validation-detail', {
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        ttl: 5000,
      });

      const storage = Storage.getInstance();
      await storage.set('test-hook-validation-detail', {
        _v: 1,
        updatedAt: Date.now(),
        data: { name: 123, age: 'invalid' },
      });

      const { result } = renderHook(() => useModel(TestModel));

      await waitFor(() => {
        const [, , , error] = result.current;
        if (error instanceof ValidationError) {
          expect(error.modelName).toBe('test-hook-validation-detail');
          expect(error.getUserMessage()).toContain('validation failed');
          expect(error.getDebugInfo()).toContain('name');
          expect(error.getDebugInfo()).toContain('age');
        }
      });
    });
  });
});
