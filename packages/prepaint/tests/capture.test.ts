import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupCapture, captureSnapshot } from '../src/capture';
import * as utilsModule from '../src/utils';
import { openDB } from '../src/utils';
import { STORAGE_CONFIG, type Snapshot } from '../src/types';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('setupCapture', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="root"><div>App</div></div>';
    vi.clearAllMocks();
  });

  afterEach(() => {
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

    let db = await openDB();
    await new Promise<void>((res) => {
      const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
      const req = store.get('/blocked') as IDBRequest<Snapshot>;
      req.onsuccess = () => res(expect(req.result).toBeUndefined());
      req.onerror = () => res();
    });
    db.close();

    window.history.pushState(null, '', '/allowed');

    handler();
    await tick();
    await tick();

    db = await openDB();
    await new Promise<void>((res) => {
      const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
      const req = store.get('/allowed') as IDBRequest<Snapshot>;
      req.onsuccess = () => res(expect(req.result).toBeDefined());
      req.onerror = () => res();
    });
    db.close();

    window.history.pushState(null, '', orig || '/');
  });
});

describe('captureSnapshot', () => {
  let db: IDBDatabase | null = null;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="root"><div id="app">Test Content</div></div>';
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (db) {
      db.close();
      db = null;
    }
    const deleteRequest = indexedDB.deleteDatabase(STORAGE_CONFIG.DB_NAME);
    await new Promise<void>((resolve) => {
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
    });
  });

  async function getSnapshot(route: string): Promise<Snapshot | null> {
    db = await openDB();
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    return new Promise((resolve, reject) => {
      const request = store.get(route) as IDBRequest<Snapshot>;
      request.onsuccess = () => resolve(request.result ?? null);
      // eslint-disable-next-line
      request.onerror = () => reject(request.error);
    });
  }

  it('captures first child of #root', async () => {
    await captureSnapshot();
    const snapshot = await getSnapshot('/');
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
    const snapshot = await getSnapshot('/');
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
    const snapshot = await getSnapshot('/');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.styles).toBeUndefined();
  });

  it('captures same-origin external stylesheets', async () => {
    const originalFetch = global.fetch;
    const originalLocation = window.location;
    const cssText = '.external { color: blue; }';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(cssText),
    } as unknown as Response);
    global.fetch = fetchMock as typeof fetch;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles/main.css';
    document.head.appendChild(link);

    try {
      Object.defineProperty(window, 'location', { value: { pathname: '/' }, writable: true });
      await captureSnapshot();
      const snapshot = await getSnapshot('/');
      expect(snapshot).not.toBeNull();
      const expectedHref = new URL('/styles/main.css', document.baseURI).href;
      expect(fetchMock).toHaveBeenCalledWith(expectedHref, {
        credentials: 'same-origin',
      });
      expect(snapshot!.styles).toContainEqual({
        type: 'external',
        href: expectedHref,
        content: cssText,
      });
    } finally {
      global.fetch = originalFetch;
      Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    }
  });

  it('captures current route from location.pathname', async () => {
    const originalPathname = window.location.pathname;
    window.history.pushState(null, '', '/products');
    document.body.innerHTML = '<div id="root"><div>Products Page</div></div>';

    await captureSnapshot();
    const snapshot = await getSnapshot('/products');

    expect(snapshot).not.toBeNull();
    expect(snapshot!.route).toBe('/products');
    expect(snapshot!.body).toBe('<div>Products Page</div>');

    window.history.pushState(null, '', originalPathname || '/');
  });

  it('sets timestamp on snapshot', async () => {
    const before = Date.now();
    await captureSnapshot();
    const snapshot = await getSnapshot('/');
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

      vi.spyOn(document, 'querySelectorAll').mockImplementationOnce(() => {
        throw new Error('querySelectorAll failed');
      });

      const result = await captureSnapshot();

      expect(result).toBeNull();
      expect(spy).toHaveBeenCalled();
      const errorCall = spy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[CaptureError]');
      expect(errorCall).toContain('style-collect');

      spy.mockRestore();
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

      const dbMock = {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn().mockReturnValue({
              onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
              onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
            }),
          }),
        }),
        close: vi.fn(),
      };

      vi.spyOn(utilsModule, 'openDB').mockResolvedValueOnce(dbMock as unknown as IDBDatabase);

      const capturePromise = captureSnapshot();

      await tick();

      // eslint-disable-next-line
      const putRequest = dbMock.transaction().objectStore().put();
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      Object.defineProperty(putRequest, 'error', { value: quotaError });
      // eslint-disable-next-line
      putRequest.onerror?.(new Event('error'));

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
      const snapshot = await getSnapshot('/');

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
      const snapshot = await getSnapshot('/');

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
      const snapshot = await getSnapshot('/');

      expect(snapshot).not.toBeNull();
      expect(snapshot!.body).toContain('href="/safe"');
      expect(snapshot!.body).toContain('class="link"');
      expect(snapshot!.body).toContain('data-id="123"');
      expect(snapshot!.body).not.toContain('onclick');
    });
  });
});
