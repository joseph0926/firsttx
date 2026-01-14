import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supportsViewTransition, abortableSleep } from '../src/utils';

describe('supportsViewTransition', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalDocument) {
      globalThis.document = originalDocument;
    }
  });

  it('should return false when document is undefined', () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
    // @ts-expect-error - testing undefined document
    delete globalThis.document;

    expect(supportsViewTransition()).toBe(false);

    if (documentDescriptor) {
      Object.defineProperty(globalThis, 'document', documentDescriptor);
    }
  });

  it('should return false when startViewTransition does not exist', () => {
    const mockDocument = {} as Document;
    globalThis.document = mockDocument;

    expect(supportsViewTransition()).toBe(false);
  });

  it('should return false when startViewTransition is not a function', () => {
    const mockDocument = {
      startViewTransition: 'not a function',
    } as unknown as Document;
    globalThis.document = mockDocument;

    expect(supportsViewTransition()).toBe(false);
  });

  it('should return true when startViewTransition is a function', () => {
    const mockDocument = {
      startViewTransition: vi.fn(),
    } as unknown as Document;
    globalThis.document = mockDocument;

    expect(supportsViewTransition()).toBe(true);
  });

  it('should return false when startViewTransition is null', () => {
    const mockDocument = {
      startViewTransition: null,
    } as unknown as Document;
    globalThis.document = mockDocument;

    expect(supportsViewTransition()).toBe(false);
  });
});

describe('abortableSleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should resolve after specified time', async () => {
      const promise = abortableSleep(1000);

      vi.advanceTimersByTime(999);
      expect(vi.getTimerCount()).toBe(1);

      vi.advanceTimersByTime(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should work without signal', async () => {
      const promise = abortableSleep(500);

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
    });

    it('should resolve with zero delay', async () => {
      const promise = abortableSleep(0);

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('abort signal handling', () => {
    it('should reject immediately if signal is already aborted', async () => {
      const controller = new AbortController();
      const error = new Error('Already aborted');
      controller.abort(error);

      await expect(abortableSleep(1000, controller.signal)).rejects.toThrow('Already aborted');
    });

    it('should reject with default Error if abort reason is not an Error', async () => {
      const controller = new AbortController();
      controller.abort('string reason');

      await expect(abortableSleep(1000, controller.signal)).rejects.toThrow('Aborted');
    });

    it('should reject when aborted during sleep', async () => {
      const controller = new AbortController();
      const promise = abortableSleep(1000, controller.signal);

      vi.advanceTimersByTime(500);
      controller.abort(new Error('Cancelled'));

      await expect(promise).rejects.toThrow('Cancelled');
    });

    it('should use abort reason if it is an Error instance', async () => {
      const controller = new AbortController();
      const customError = new Error('Custom abort error');
      const promise = abortableSleep(1000, controller.signal);

      vi.advanceTimersByTime(100);
      controller.abort(customError);

      await expect(promise).rejects.toThrow('Custom abort error');
    });

    it('should use default "Aborted" message if reason is not an Error', async () => {
      const controller = new AbortController();
      const promise = abortableSleep(1000, controller.signal);

      vi.advanceTimersByTime(100);
      controller.abort('non-error reason');

      await expect(promise).rejects.toThrow('Aborted');
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on abort', async () => {
      const controller = new AbortController();
      const promise = abortableSleep(1000, controller.signal);

      expect(vi.getTimerCount()).toBe(1);

      controller.abort(new Error('Aborted'));
      await promise.catch(() => {}); // Handle rejection

      // Timer should be cleared
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should remove abort listener on normal completion', async () => {
      const controller = new AbortController();
      const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

      const promise = abortableSleep(100, controller.signal);
      await vi.runAllTimersAsync();
      await promise;

      expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('should remove abort listener on abort', async () => {
      const controller = new AbortController();
      const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

      const promise = abortableSleep(1000, controller.signal);
      controller.abort(new Error('Aborted'));
      await promise.catch(() => {}); // Handle rejection

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple abort calls gracefully', async () => {
      const controller = new AbortController();
      const promise = abortableSleep(1000, controller.signal);

      controller.abort(new Error('First abort'));
      controller.abort(new Error('Second abort')); // Should be ignored

      await expect(promise).rejects.toThrow('First abort');
    });

    it('should handle undefined signal reason', async () => {
      const controller = new AbortController();
      const promise = abortableSleep(1000, controller.signal);

      vi.advanceTimersByTime(100);
      controller.abort(); // No reason provided - defaults to DOMException

      // When no reason is provided, the reason may be a DOMException or undefined
      // The abortableSleep function converts non-Error reasons to "Aborted"
      await expect(promise).rejects.toThrow();
    });

    it('should not resolve after abort', async () => {
      const controller = new AbortController();
      const resolveSpy = vi.fn();
      const rejectSpy = vi.fn();

      const promise = abortableSleep(1000, controller.signal);
      promise.then(resolveSpy).catch(rejectSpy);

      controller.abort(new Error('Aborted'));
      await vi.runAllTimersAsync();

      expect(resolveSpy).not.toHaveBeenCalled();
      expect(rejectSpy).toHaveBeenCalled();
    });
  });
});
