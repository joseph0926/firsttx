import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emitDevToolsEvent } from '../src/devtools';

describe('emitDevToolsEvent', () => {
  let originalWindow: typeof window;
  let mockEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalWindow = global.window;
    mockEmit = vi.fn();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'test-uuid-1234-5678-9abc-def012345678' as `${string}-${string}-${string}-${string}-${string}`,
    );
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    global.window = originalWindow;
    delete (window as Window & { __FIRSTTX_DEVTOOLS__?: unknown }).__FIRSTTX_DEVTOOLS__;
    vi.restoreAllMocks();
  });

  describe('when DevTools API is available', () => {
    beforeEach(() => {
      window.__FIRSTTX_DEVTOOLS__ = { emit: mockEmit as (event: unknown) => void };
    });

    it('emits capture event with correct structure', () => {
      const captureData = {
        route: '/home',
        bodySize: 1024,
        styleCount: 3,
        hasVolatile: true,
        duration: 15,
      };

      emitDevToolsEvent('capture', captureData);

      expect(mockEmit).toHaveBeenCalledWith({
        id: 'test-uuid-1234-5678-9abc-def012345678',
        category: 'prepaint',
        type: 'capture',
        timestamp: 1700000000000,
        data: captureData,
        priority: 0,
      });
    });

    it('emits restore event with correct structure', () => {
      const restoreData = {
        route: '/cart',
        strategy: 'has-prepaint' as const,
        snapshotAge: 3600000,
        restoreDuration: 5,
      };

      emitDevToolsEvent('restore', restoreData);

      expect(mockEmit).toHaveBeenCalledWith({
        id: 'test-uuid-1234-5678-9abc-def012345678',
        category: 'prepaint',
        type: 'restore',
        timestamp: 1700000000000,
        data: restoreData,
        priority: 1,
      });
    });

    it('emits handoff event with correct structure', () => {
      const handoffData = {
        strategy: 'cold-start' as const,
        canHydrate: false,
      };

      emitDevToolsEvent('handoff', handoffData);

      expect(mockEmit).toHaveBeenCalledWith({
        id: 'test-uuid-1234-5678-9abc-def012345678',
        category: 'prepaint',
        type: 'handoff',
        timestamp: 1700000000000,
        data: handoffData,
        priority: 1,
      });
    });

    it('emits hydration.error event with correct structure', () => {
      const errorData = {
        error: 'Hydration mismatch',
        mismatchType: 'content' as const,
        recovered: true,
        route: '/checkout',
      };

      emitDevToolsEvent('hydration.error', errorData);

      expect(mockEmit).toHaveBeenCalledWith({
        id: 'test-uuid-1234-5678-9abc-def012345678',
        category: 'prepaint',
        type: 'hydration.error',
        timestamp: 1700000000000,
        data: errorData,
        priority: 2,
      });
    });

    it('emits storage.error event with correct structure', () => {
      const storageErrorData = {
        operation: 'write' as const,
        code: 'QUOTA_EXCEEDED',
        recoverable: false,
        route: '/product/123',
      };

      emitDevToolsEvent('storage.error', storageErrorData);

      expect(mockEmit).toHaveBeenCalledWith({
        id: 'test-uuid-1234-5678-9abc-def012345678',
        category: 'prepaint',
        type: 'storage.error',
        timestamp: 1700000000000,
        data: storageErrorData,
        priority: 2,
      });
    });

    it('generates unique IDs for each event', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce(
          'uuid-1111-2222-3333-444444444444' as `${string}-${string}-${string}-${string}-${string}`,
        )
        .mockReturnValueOnce(
          'uuid-2222-3333-4444-555555555555' as `${string}-${string}-${string}-${string}-${string}`,
        )
        .mockReturnValueOnce(
          'uuid-3333-4444-5555-666666666666' as `${string}-${string}-${string}-${string}-${string}`,
        );

      emitDevToolsEvent('capture', {
        route: '/',
        bodySize: 0,
        styleCount: 0,
        hasVolatile: false,
        duration: 0,
      });
      emitDevToolsEvent('restore', {
        route: '/',
        strategy: 'cold-start',
        snapshotAge: 0,
        restoreDuration: 0,
      });
      emitDevToolsEvent('handoff', { strategy: 'cold-start', canHydrate: false });

      expect(mockEmit).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: 'uuid-1111-2222-3333-444444444444' }),
      );
      expect(mockEmit).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: 'uuid-2222-3333-4444-555555555555' }),
      );
      expect(mockEmit).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ id: 'uuid-3333-4444-5555-666666666666' }),
      );
    });

    it('uses correct priority for different event types', () => {
      emitDevToolsEvent('capture', {
        route: '/',
        bodySize: 0,
        styleCount: 0,
        hasVolatile: false,
        duration: 0,
      });
      emitDevToolsEvent('restore', {
        route: '/',
        strategy: 'cold-start',
        snapshotAge: 0,
        restoreDuration: 0,
      });
      emitDevToolsEvent('hydration.error', {
        error: '',
        mismatchType: 'content',
        recovered: false,
        route: '/',
      });

      expect(mockEmit).toHaveBeenNthCalledWith(1, expect.objectContaining({ priority: 0 }));
      expect(mockEmit).toHaveBeenNthCalledWith(2, expect.objectContaining({ priority: 1 }));
      expect(mockEmit).toHaveBeenNthCalledWith(3, expect.objectContaining({ priority: 2 }));
    });
  });

  describe('when DevTools API is not available', () => {
    it('does nothing when __FIRSTTX_DEVTOOLS__ is undefined', () => {
      delete (window as Window & { __FIRSTTX_DEVTOOLS__?: unknown }).__FIRSTTX_DEVTOOLS__;

      expect(() => {
        emitDevToolsEvent('capture', {
          route: '/',
          bodySize: 0,
          styleCount: 0,
          hasVolatile: false,
          duration: 0,
        });
      }).not.toThrow();
    });

    it('does nothing when __FIRSTTX_DEVTOOLS__ is null', () => {
      (window as Window & { __FIRSTTX_DEVTOOLS__?: unknown }).__FIRSTTX_DEVTOOLS__ =
        null as unknown as undefined;

      expect(() => {
        emitDevToolsEvent('restore', {
          route: '/',
          strategy: 'cold-start',
          snapshotAge: 0,
          restoreDuration: 0,
        });
      }).not.toThrow();
    });

    it('does nothing when emit is not a function', () => {
      (window as Window & { __FIRSTTX_DEVTOOLS__?: unknown }).__FIRSTTX_DEVTOOLS__ = {
        emit: 'not a function',
      } as unknown as { emit: () => void };

      expect(() => {
        emitDevToolsEvent('handoff', { strategy: 'cold-start', canHydrate: false });
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('catches and suppresses errors from emit', () => {
      const throwingEmit = vi.fn().mockImplementation(() => {
        throw new Error('Emit failed');
      });
      window.__FIRSTTX_DEVTOOLS__ = { emit: throwingEmit };

      expect(() => {
        emitDevToolsEvent('capture', {
          route: '/',
          bodySize: 0,
          styleCount: 0,
          hasVolatile: false,
          duration: 0,
        });
      }).not.toThrow();
    });

    it('logs warning in dev mode when emit fails', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const throwingEmit = vi.fn().mockImplementation(() => {
        throw new Error('Emit failed');
      });
      window.__FIRSTTX_DEVTOOLS__ = { emit: throwingEmit };

      // Set dev mode
      (globalThis as unknown as { __FIRSTTX_DEV__: boolean }).__FIRSTTX_DEV__ = true;

      emitDevToolsEvent('capture', {
        route: '/',
        bodySize: 0,
        styleCount: 0,
        hasVolatile: false,
        duration: 0,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[FirstTx Prepaint] DevTools emit failed:',
        expect.any(Error),
      );

      delete (globalThis as unknown as { __FIRSTTX_DEV__?: boolean }).__FIRSTTX_DEV__;
      consoleSpy.mockRestore();
    });

    it('does not log warning in production mode when emit fails', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const throwingEmit = vi.fn().mockImplementation(() => {
        throw new Error('Emit failed');
      });
      window.__FIRSTTX_DEVTOOLS__ = { emit: throwingEmit };

      // Ensure dev mode is off
      delete (globalThis as unknown as { __FIRSTTX_DEV__?: boolean }).__FIRSTTX_DEV__;

      emitDevToolsEvent('capture', {
        route: '/',
        bodySize: 0,
        styleCount: 0,
        hasVolatile: false,
        duration: 0,
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles crypto.randomUUID not available', () => {
      window.__FIRSTTX_DEVTOOLS__ = { emit: mockEmit as (event: unknown) => void };
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(crypto.randomUUID).mockImplementation(() => {
        throw new Error('randomUUID not supported');
      });

      expect(() => {
        emitDevToolsEvent('capture', {
          route: '/',
          bodySize: 0,
          styleCount: 0,
          hasVolatile: false,
          duration: 0,
        });
      }).not.toThrow();
    });
  });

  describe('server-side rendering safety', () => {
    it('handles missing window gracefully', () => {
      const originalWindow = global.window;
      // @ts-expect-error - testing SSR scenario
      delete global.window;

      expect(() => {
        emitDevToolsEvent('capture', {
          route: '/',
          bodySize: 0,
          styleCount: 0,
          hasVolatile: false,
          duration: 0,
        });
      }).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('event data validation', () => {
    beforeEach(() => {
      window.__FIRSTTX_DEVTOOLS__ = { emit: mockEmit as (event: unknown) => void };
    });

    it('passes through complex data structures', () => {
      const complexData = {
        route: '/product/123?query=test#section',
        bodySize: 999999,
        styleCount: 100,
        hasVolatile: true,
        duration: 0.5,
      };

      emitDevToolsEvent('capture', complexData);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          data: complexData,
        }),
      );
    });

    it('handles special characters in route', () => {
      const data = {
        route: '/path/with spaces/and/한글',
        strategy: 'has-prepaint' as const,
        snapshotAge: 0,
        restoreDuration: 0,
      };

      emitDevToolsEvent('restore', data);

      const emittedEvent = mockEmit.mock.calls[0]?.[0] as { data?: { route?: string } } | undefined;
      expect(emittedEvent?.data?.route).toBe('/path/with spaces/and/한글');
    });

    it('handles zero values correctly', () => {
      const zeroData = {
        route: '',
        bodySize: 0,
        styleCount: 0,
        hasVolatile: false,
        duration: 0,
      };

      emitDevToolsEvent('capture', zeroData);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          data: zeroData,
        }),
      );
    });
  });
});
