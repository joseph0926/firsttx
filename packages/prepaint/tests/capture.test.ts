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
    Object.defineProperty(window, 'location', { value: { pathname: '/blocked' }, writable: true });

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

    Object.defineProperty(window, 'location', { value: { pathname: '/allowed' }, writable: true });
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

    Object.defineProperty(window, 'location', { value: { pathname: orig }, writable: true });
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
    expect(snapshot!.styles!).toContain('.test { color: red; }');
    expect(snapshot!.styles!).not.toContain('.ignore { display:none; }');
  });

  it('handles empty styles', async () => {
    await captureSnapshot();
    const snapshot = await getSnapshot('/');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.styles).toBeUndefined();
  });

  it('captures current route from location.pathname', async () => {
    const originalPathname = window.location.pathname;
    Object.defineProperty(window, 'location', { value: { pathname: '/products' }, writable: true });
    document.body.innerHTML = '<div id="root"><div>Products Page</div></div>';

    await captureSnapshot();
    const snapshot = await getSnapshot('/products');

    expect(snapshot).not.toBeNull();
    expect(snapshot!.route).toBe('/products');
    expect(snapshot!.body).toBe('<div>Products Page</div>');

    Object.defineProperty(window, 'location', {
      value: { pathname: originalPathname },
      writable: true,
    });
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

  it('handles capture errors gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const openSpy = vi.spyOn(utilsModule, 'openDB').mockRejectedValueOnce(new Error('DB Error'));

    await captureSnapshot();

    expect(errSpy).toHaveBeenCalledWith('[FirstTx] Capture failed:', expect.any(Error));

    openSpy.mockRestore();
    errSpy.mockRestore();
  });
});
