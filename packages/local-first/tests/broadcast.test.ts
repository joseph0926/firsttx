import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { Storage } from '../src/storage';
import { defineModel } from '../src';
import { ModelBroadcaster } from '../src/broadcast';

describe('Model with BroadcastChannel', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);

    if (ModelBroadcaster['instance']) {
      ModelBroadcaster['instance'].close();
      ModelBroadcaster['instance'] = undefined;
    }
  });

  afterEach(() => {
    if (ModelBroadcaster['instance']) {
      ModelBroadcaster['instance'].close();
      ModelBroadcaster['instance'] = undefined;
    }
  });

  describe('Cross-Tab Synchronization', () => {
    it('should broadcast on patch', async () => {
      const TestModel = defineModel('sync-test', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      await TestModel.replace({ count: 0 });

      const broadcaster = ModelBroadcaster.getInstance();
      const broadcastSpy = vi.spyOn(broadcaster, 'broadcast');

      await TestModel.patch((draft) => {
        draft.count = 1;
      });

      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'model-patched',
        key: 'sync-test',
      });
    });

    it('should broadcast on replace', async () => {
      const TestModel = defineModel('sync-replace', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const broadcaster = ModelBroadcaster.getInstance();
      const broadcastSpy = vi.spyOn(broadcaster, 'broadcast');

      await TestModel.replace({ value: 'new' });

      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'model-replaced',
        key: 'sync-replace',
      });
    });

    it('should reload cache when receiving broadcast', async () => {
      const TestModel = defineModel('sync-reload', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      await TestModel.replace({ count: 10 });

      const storage = Storage.getInstance();
      await storage.set('sync-reload', {
        _v: 1,
        updatedAt: Date.now(),
        data: { count: 20 },
      });

      const broadcaster = ModelBroadcaster.getInstance();
      const event = new MessageEvent('message', {
        data: {
          type: 'model-patched',
          key: 'sync-reload',
          senderId: 'other-tab',
          timestamp: Date.now(),
        },
      });

      broadcaster['channel'].dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(TestModel.getCachedSnapshot()).toEqual({ count: 20 });
    });

    it('should not reload cache for own messages', async () => {
      const TestModel = defineModel('sync-own', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      await TestModel.replace({ count: 5 });

      const subscriberCalled = vi.fn();
      const unsubscribe = TestModel.subscribe(subscriberCalled);

      await TestModel.patch((draft) => {
        draft.count = 6;
      });

      subscriberCalled.mockClear();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(subscriberCalled).not.toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Multiple Models', () => {
    it('should broadcast different keys independently', async () => {
      const CartModel = defineModel('cart-multi', {
        schema: z.object({ items: z.array(z.string()) }),
        ttl: 5000,
      });

      const UserModel = defineModel('user-multi', {
        schema: z.object({ name: z.string() }),
        ttl: 5000,
      });

      await CartModel.replace({ items: [] });
      await UserModel.replace({ name: 'John' });

      const broadcaster = ModelBroadcaster.getInstance();
      const broadcastSpy = vi.spyOn(broadcaster, 'broadcast');

      await CartModel.patch((draft) => {
        draft.items.push('apple');
      });

      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'model-patched',
        key: 'cart-multi',
      });

      broadcastSpy.mockClear();

      await UserModel.replace({ name: 'Jane' });

      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'model-replaced',
        key: 'user-multi',
      });
    });

    it('should only reload affected model', async () => {
      const CartModel = defineModel('cart-isolated', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      const UserModel = defineModel('user-isolated', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      await CartModel.replace({ count: 1 });
      await UserModel.replace({ count: 100 });

      const cartSubscriber = vi.fn();
      const userSubscriber = vi.fn();

      const unsubCart = CartModel.subscribe(cartSubscriber);
      const unsubUser = UserModel.subscribe(userSubscriber);

      cartSubscriber.mockClear();
      userSubscriber.mockClear();

      const broadcaster = ModelBroadcaster.getInstance();
      const event = new MessageEvent('message', {
        data: {
          type: 'model-patched',
          key: 'cart-isolated',
          senderId: 'other-tab',
          timestamp: Date.now(),
        },
      });

      broadcaster['channel'].dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cartSubscriber).toHaveBeenCalled();
      expect(userSubscriber).not.toHaveBeenCalled();

      unsubCart();
      unsubUser();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing data gracefully', async () => {
      const TestModel = defineModel('sync-missing', {
        schema: z.object({ value: z.string() }),
        ttl: 5000,
      });

      const broadcaster = ModelBroadcaster.getInstance();
      const event = new MessageEvent('message', {
        data: {
          type: 'model-patched',
          key: 'sync-missing',
          senderId: 'other-tab',
          timestamp: Date.now(),
        },
      });

      expect(() => {
        broadcaster['channel'].dispatchEvent(event);
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(TestModel.getCachedSnapshot()).toBeNull();
    });
  });

  describe('Fallback Mode', () => {
    let originalBroadcastChannel: typeof BroadcastChannel;

    beforeEach(() => {
      originalBroadcastChannel = global.BroadcastChannel;
    });

    afterEach(() => {
      global.BroadcastChannel = originalBroadcastChannel;
    });

    it('should crash when BroadcastChannel is undefined', () => {
      // @ts-expect-error assigning undefined for testing purposes
      global.BroadcastChannel = undefined;

      expect(() => {
        ModelBroadcaster.getInstance();
      }).not.toThrow(TypeError);
      expect(() => {
        ModelBroadcaster.getInstance();
      }).not.toThrow(/is not a constructor/);
    });

    it('should NOT crash when BroadcastChannel is undefined', () => {
      // @ts-expect-error assigning undefined for testing purposes
      global.BroadcastChannel = undefined;

      const broadcaster = ModelBroadcaster.getInstance();

      expect(broadcaster).toBeDefined();
      expect(broadcaster).toHaveProperty('broadcast');
      expect(broadcaster).toHaveProperty('subscribe');
      expect(broadcaster).toHaveProperty('close');
    });

    it('should allow model operations in fallback mode', async () => {
      // @ts-expect-error assigning undefined for testing purposes
      global.BroadcastChannel = undefined;

      const TestModel = defineModel('fallback-test', {
        schema: z.object({ count: z.number() }),
        ttl: 5000,
      });

      await TestModel.replace({ count: 0 });
      await TestModel.patch((draft) => {
        draft.count = 1;
      });

      expect(TestModel.getCachedSnapshot()).toEqual({ count: 1 });
    });
  });
});
