import { describe, it, expect, beforeEach } from 'vitest';
import { defineModel } from '../src/model';
import { Storage } from '../src/storage';
import { z } from 'zod';
import { ValidationError } from '../src/errors';

describe('Model', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  describe('getSnapshot - first visit', () => {
    it('should return null when no data exists', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      const result = await TestModel.getSnapshot();

      expect(result).toBeNull();
    });
  });

  describe('replace', () => {
    it('should store data to IndexedDB', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      const serverData = { items: ['apple', 'banana'] };
      await TestModel.replace(serverData);

      const storage = Storage.getInstance();
      const stored = await storage.get('cart');

      expect(stored).toBeDefined();
      expect(stored?.data).toEqual(serverData);
      expect(stored?._v).toBe(1);
      expect(stored?.updatedAt).toBeGreaterThan(0);
    });

    it('should validate data with schema before storing', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      const invalidData = { items: [123, 456] };

      // @ts-expect-error — intentional: we're testing an error case, so ignore the type error here
      await expect(TestModel.replace(invalidData)).rejects.toThrow();
    });

    it('should use custom version when provided', async () => {
      const TestModel = defineModel('cart', {
        version: 3,
        initialData: { items: [] },
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      await TestModel.replace({ items: ['test'] });

      const storage = Storage.getInstance();
      const stored = await storage.get('cart');

      expect(stored?._v).toBe(3);
    });

    it('should merge incoming data with existing using merge option', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
        merge: (current, incoming) => ({ items: [...current.items, ...incoming.items] }),
      });

      await TestModel.replace({ items: ['apple'] });
      await TestModel.replace({ items: ['banana'] });

      const storage = Storage.getInstance();
      const stored = await storage.get('cart');

      expect(stored?.data).toEqual({ items: ['apple', 'banana'] });
    });
  });

  describe('getSnapshot - re visit', () => {
    it('should return validated snapshot when data exists', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      await TestModel.replace({ items: ['apple', 'banana'] });

      const snapshot = await TestModel.getSnapshot();

      expect(snapshot).toEqual({ items: ['apple', 'banana'] });
    });

    it('should delete corrupted data and return null', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      const storage = Storage.getInstance();
      await storage.set('cart', {
        _v: 1,
        updatedAt: Date.now(),
        data: { items: [123, 456] },
      });

      await expect(TestModel.getSnapshot()).rejects.toThrow(
        '[FirstTx] Invalid data for model "cart" - removed corrupted data',
      );

      const stored = await storage.get('cart');
      expect(stored).toBeNull();
    });
  });

  describe('patch', () => {
    it('should mutate existing data', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      await TestModel.replace({ items: ['apple'] });

      await TestModel.patch((draft) => {
        draft.items.push('banana');
      });

      const snapshot = await TestModel.getSnapshot();
      expect(snapshot?.items).toEqual(['apple', 'banana']);
    });

    it('should use initialData when no data exists', async () => {
      const TestModel = defineModel('cart', {
        version: 1,
        initialData: { items: [] },
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      await TestModel.patch((draft) => {
        draft.items.push('first-item');
      });

      const snapshot = await TestModel.getSnapshot();
      expect(snapshot?.items).toEqual(['first-item']);
    });

    it('should throw when no data and no initialData', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      await expect(
        TestModel.patch((draft) => {
          draft.items.push('item');
        }),
      ).rejects.toThrow(
        '[FirstTx] Cannot patch model "cart" - no data exists and no initialData provided',
      );
    });

    it('should validate mutated data', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      await TestModel.replace({ items: ['apple'] });

      await expect(
        TestModel.patch((draft) => {
          // @ts-expect-error — intentional: we're testing an error case, so ignore the type error here
          draft.items.push(123);
        }),
      ).rejects.toThrow('[FirstTx] Patch validation failed');
    });

    it('should apply concurrent patches without losing updates', async () => {
      const CounterModel = defineModel('counter', {
        initialData: { count: 0 },
        schema: z.object({
          count: z.number(),
        }),
        ttl: 5000,
      });

      await CounterModel.replace({ count: 0 });

      await Promise.all([
        CounterModel.patch((draft) => {
          draft.count += 1;
        }),
        CounterModel.patch((draft) => {
          draft.count += 1;
        }),
      ]);

      const snapshot = await CounterModel.getSnapshot();
      expect(snapshot?.count).toBe(2);
    });
  });

  describe('getHistory', () => {
    it('should return default values when no data exists', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      const history = await TestModel.getHistory();

      expect(history.updatedAt).toBe(0);
      expect(history.age).toBe(Infinity);
      expect(history.isStale).toBe(true);
      expect(history.isConflicted).toBe(false);
    });

    it('should return isStale=false when data is fresh', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      const storage = Storage.getInstance();
      const now = Date.now();

      await storage.set('cart', {
        _v: 1,
        updatedAt: now - 2000,
        data: { items: ['apple'] },
      });

      const history = await TestModel.getHistory();

      expect(history.updatedAt).toBe(now - 2000);
      expect(history.age).toBeCloseTo(2000, -2);
      expect(history.isStale).toBe(false);
      expect(history.isConflicted).toBe(false);
    });

    it('should return isStale=true when data exceeds TTL', async () => {
      const TestModel = defineModel('cart', {
        schema: z.object({
          items: z.array(z.string()),
        }),
        ttl: 5000,
      });

      const storage = Storage.getInstance();
      const now = Date.now();

      await storage.set('cart', {
        _v: 1,
        updatedAt: now - 8000,
        data: { items: ['apple'] },
      });

      const history = await TestModel.getHistory();

      expect(history.updatedAt).toBe(now - 8000);
      expect(history.age).toBeCloseTo(8000, -2);
      expect(history.isStale).toBe(true);
      expect(history.isConflicted).toBe(false);
    });
  });

  describe('Model - Error Handling', () => {
    beforeEach(() => {
      indexedDB.deleteDatabase('firsttx');
      Storage.setInstance(undefined);
    });

    describe('ValidationError on getSnapshot', () => {
      it('should throw ValidationError on corrupted data in development', async () => {
        const TestModel = defineModel('test-validation', {
          schema: z.object({
            count: z.number(),
          }),
          ttl: 5000,
        });

        const storage = Storage.getInstance();
        await storage.set('test-validation', {
          _v: 1,
          updatedAt: Date.now(),
          data: { count: 'invalid' },
        });

        await expect(TestModel.getSnapshot()).rejects.toThrow(ValidationError);
      });

      it('should delete corrupted data and return null', async () => {
        const TestModel = defineModel('test-validation-2', {
          schema: z.object({
            items: z.array(z.string()),
          }),
          ttl: 5000,
        });

        const storage = Storage.getInstance();
        await storage.set('test-validation-2', {
          _v: 1,
          updatedAt: Date.now(),
          data: { items: [123, 456] },
        });

        await expect(TestModel.getSnapshot()).rejects.toThrow();

        const stored = await storage.get('test-validation-2');
        expect(stored).toBeNull();
      });
    });

    describe('ValidationError on replace', () => {
      it('should throw ValidationError on invalid data', async () => {
        const TestModel = defineModel('test-replace-validation', {
          schema: z.object({
            name: z.string(),
            age: z.number(),
          }),
          ttl: 5000,
        });

        await expect(
          // @ts-expect-error test type error
          TestModel.replace({ name: 'John', age: 'invalid' }),
        ).rejects.toThrow(ValidationError);
      });
    });

    describe('ValidationError on patch', () => {
      it('should throw ValidationError when patch creates invalid data', async () => {
        const TestModel = defineModel('test-patch-validation', {
          schema: z.object({
            count: z.number(),
          }),
          ttl: 5000,
        });

        await TestModel.replace({ count: 10 });

        await expect(
          TestModel.patch((draft) => {
            // @ts-expect-error - intentional type error for testing
            draft.count = 'invalid';
          }),
        ).rejects.toThrow(ValidationError);
      });
    });

    describe('getCachedError', () => {
      it('should return null when no error', async () => {
        const TestModel = defineModel('test-no-error', {
          schema: z.object({ value: z.string() }),
          ttl: 5000,
        });

        await TestModel.replace({ value: 'test' });

        expect(TestModel.getCachedError()).toBeNull();
      });

      it('should expose ValidationError via subscribe', async () => {
        const TestModel = defineModel('test-subscribe-error', {
          schema: z.object({ count: z.number() }),
          ttl: 5000,
        });

        const storage = Storage.getInstance();
        await storage.set('test-subscribe-error', {
          _v: 1,
          updatedAt: Date.now(),
          data: { count: 'invalid' },
        });

        let notified = false;
        const unsubscribe = TestModel.subscribe(() => {
          notified = true;
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(notified).toBe(true);

        const error = TestModel.getCachedError();
        expect(error).toBeInstanceOf(ValidationError);
        expect(error).not.toBeNull();

        expect((error as ValidationError).modelName).toBe('test-subscribe-error');

        unsubscribe();
      });
    });
  });
});
