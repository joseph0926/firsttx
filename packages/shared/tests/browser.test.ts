import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  supportsViewTransition,
  getCurrentOrigin,
  sanitizeHTML,
  sanitizeHTMLSync,
  safeSetInnerHTML,
  safeSetInnerHTMLSync,
  safePostMessage,
  abortableSleep,
} from '../src/browser';

describe('browser utilities', () => {
  describe('supportsViewTransition', () => {
    const originalDocument = globalThis.document;

    afterEach(() => {
      // Restore original document
      Object.defineProperty(globalThis, 'document', {
        value: originalDocument,
        writable: true,
        configurable: true,
      });
    });

    it('should return false when document is undefined', () => {
      Object.defineProperty(globalThis, 'document', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(supportsViewTransition()).toBe(false);
    });

    it('should return false when startViewTransition is not available', () => {
      const mockDocument = {};
      Object.defineProperty(globalThis, 'document', {
        value: mockDocument,
        writable: true,
        configurable: true,
      });

      expect(supportsViewTransition()).toBe(false);
    });

    it('should return true when startViewTransition is available', () => {
      const mockDocument = {
        startViewTransition: vi.fn(),
      };
      Object.defineProperty(globalThis, 'document', {
        value: mockDocument,
        writable: true,
        configurable: true,
      });

      expect(supportsViewTransition()).toBe(true);
    });

    it('should return false when startViewTransition is not a function', () => {
      const mockDocument = {
        startViewTransition: 'not a function',
      };
      Object.defineProperty(globalThis, 'document', {
        value: mockDocument,
        writable: true,
        configurable: true,
      });

      expect(supportsViewTransition()).toBe(false);
    });
  });

  describe('getCurrentOrigin', () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });

    it('should return null when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(getCurrentOrigin()).toBe(null);
    });

    it('should return origin when available', () => {
      const mockWindow = {
        location: {
          origin: 'https://example.com',
        },
      };
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      });

      expect(getCurrentOrigin()).toBe('https://example.com');
    });

    it('should return null when origin is "null"', () => {
      const mockWindow = {
        location: {
          origin: 'null',
        },
      };
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      });

      expect(getCurrentOrigin()).toBe(null);
    });

    it('should return null when location throws security error', () => {
      const mockWindow = {
        get location() {
          throw new Error('Security error');
        },
      };
      Object.defineProperty(globalThis, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      });

      expect(getCurrentOrigin()).toBe(null);
    });
  });

  describe('sanitizeHTMLSync', () => {
    it('should remove script tags by default', () => {
      const html = '<div>Hello</div><script>alert("xss")</script>';
      const result = sanitizeHTMLSync(html);

      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should remove onclick handlers', () => {
      // Use span instead of button since button is in DANGEROUS_HTML_TAGS
      const html = '<span onclick="alert(1)">Click</span>';
      const result = sanitizeHTMLSync(html);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Click');
    });

    it('should remove javascript: URLs', () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHTMLSync(html);

      expect(result).not.toContain('javascript:');
    });

    it('should preserve safe HTML', () => {
      const html = '<div class="container"><p>Hello <strong>World</strong></p></div>';
      const result = sanitizeHTMLSync(html);

      expect(result).toContain('container');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove iframe tags', () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHTMLSync(html);

      expect(result).not.toContain('<iframe');
    });

    it('should remove on* attributes', () => {
      const html = '<div onmouseover="alert(1)" onfocus="alert(2)">Test</div>';
      const result = sanitizeHTMLSync(html);

      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('onfocus');
    });

    it('should respect allowedTags option', () => {
      const html = '<script>code</script><iframe src="test"></iframe>';
      const result = sanitizeHTMLSync(html, { allowedTags: ['script'] });

      // script is allowed but iframe is not
      expect(result).not.toContain('<iframe');
    });
  });

  describe('sanitizeHTML (async)', () => {
    it('should sanitize HTML asynchronously', async () => {
      const html = '<div onclick="alert(1)">Safe</div>';
      const result = await sanitizeHTML(html);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Safe');
    });
  });

  describe('safeSetInnerHTMLSync', () => {
    it('should set sanitized innerHTML', () => {
      const container = document.createElement('div');
      const html = '<p onclick="alert(1)">Test</p>';

      safeSetInnerHTMLSync(container, html);

      expect(container.innerHTML).toContain('Test');
      expect(container.innerHTML).not.toContain('onclick');
    });
  });

  describe('safeSetInnerHTML (async)', () => {
    it('should set sanitized innerHTML asynchronously', async () => {
      const container = document.createElement('div');
      const html = '<p onclick="alert(1)">Async Test</p>';

      await safeSetInnerHTML(container, html);

      expect(container.innerHTML).toContain('Async Test');
      expect(container.innerHTML).not.toContain('onclick');
    });
  });

  describe('safePostMessage', () => {
    it('should post message to target window', () => {
      const postMessageMock = vi.fn();
      const mockTarget = {
        postMessage: postMessageMock,
      } as unknown as Window;

      const result = safePostMessage(
        mockTarget,
        { type: 'test' },
        { targetOrigin: 'https://example.com' },
      );

      expect(result).toBe(true);
      expect(postMessageMock).toHaveBeenCalledWith({ type: 'test' }, 'https://example.com');
    });

    it('should use current origin when targetOrigin not provided', () => {
      const originalWindow = globalThis.window;
      const postMessageMock = vi.fn();
      const mockTarget = {
        postMessage: postMessageMock,
      } as unknown as Window;

      Object.defineProperty(globalThis, 'window', {
        value: { location: { origin: 'https://current.com' } },
        writable: true,
        configurable: true,
      });

      const result = safePostMessage(mockTarget, 'test');

      expect(result).toBe(true);
      expect(postMessageMock).toHaveBeenCalledWith('test', 'https://current.com');

      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });

    it('should return false when origin cannot be determined', () => {
      const originalWindow = globalThis.window;
      const mockTarget = {
        postMessage: vi.fn(),
      } as unknown as Window;

      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = safePostMessage(mockTarget, 'test');

      expect(result).toBe(false);

      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });

    it('should handle postMessage errors', () => {
      const mockTarget = {
        postMessage: vi.fn().mockImplementation(() => {
          throw new Error('Failed');
        }),
      } as unknown as Window;

      const result = safePostMessage(mockTarget, 'test', { targetOrigin: 'https://example.com' });

      expect(result).toBe(false);
    });

    it('should pass transfer array when provided', () => {
      const postMessageMock = vi.fn();
      const mockTarget = {
        postMessage: postMessageMock,
      } as unknown as Window;
      const buffer = new ArrayBuffer(8);

      safePostMessage(
        mockTarget,
        { data: 'test' },
        { targetOrigin: 'https://example.com', transfer: [buffer] },
      );

      expect(postMessageMock).toHaveBeenCalledWith({ data: 'test' }, 'https://example.com', [
        buffer,
      ]);
    });
  });

  describe('abortableSleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve after specified time', async () => {
      const promise = abortableSleep(1000);

      vi.advanceTimersByTime(1000);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject immediately if signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort(new Error('Already aborted'));

      await expect(abortableSleep(1000, controller.signal)).rejects.toThrow('Already aborted');
    });

    it('should reject when signal is aborted during sleep', async () => {
      const controller = new AbortController();
      const promise = abortableSleep(1000, controller.signal);

      vi.advanceTimersByTime(500);
      controller.abort(new Error('Aborted mid-sleep'));

      await expect(promise).rejects.toThrow('Aborted mid-sleep');
    });

    it('should reject with default error when abort reason is not an Error', async () => {
      const controller = new AbortController();
      const promise = abortableSleep(1000, controller.signal);

      controller.abort('string reason');

      await expect(promise).rejects.toThrow('Aborted');
    });

    it('should work without signal', async () => {
      const promise = abortableSleep(500);

      vi.advanceTimersByTime(500);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
