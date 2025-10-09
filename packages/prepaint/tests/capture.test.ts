import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupCapture, captureSnapshot } from '../src/capture';
import { openDB } from '../src/utils';
import { STORAGE_CONFIG, type Snapshot } from '../src/types';

describe('setupCapture', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it('should register beforeunload listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    cleanup = setupCapture();

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should warn when called multiple times in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleWarnSpy = vi.spyOn(console, 'warn');

    cleanup = setupCapture();
    setupCapture();

    expect(consoleWarnSpy).toHaveBeenCalledWith('[FirstTx] setupCapture already called');

    process.env.NODE_ENV = originalEnv;
  });

  it('should return noop cleanup on duplicate call', () => {
    const cleanup1 = setupCapture();
    const cleanup2 = setupCapture();

    expect(typeof cleanup1).toBe('function');
    expect(typeof cleanup2).toBe('function');

    cleanup = cleanup1;
  });

  it('should cleanup listener when cleanup is called', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    cleanup = setupCapture();

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    cleanup();
    cleanup = null;

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should allow re-registration after cleanup', () => {
    const addEventListenerSpy1 = vi.spyOn(window, 'addEventListener');
    cleanup = setupCapture();
    expect(addEventListenerSpy1).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    cleanup();
    cleanup = null;
    vi.clearAllMocks();

    const addEventListenerSpy2 = vi.spyOn(window, 'addEventListener');
    cleanup = setupCapture();

    expect(addEventListenerSpy2).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});

describe('captureSnapshot', () => {
  let db: IDBDatabase | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
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

  it('should capture body innerHTML', async () => {
    document.body.innerHTML = '<div id="app">Test Content</div>';

    await captureSnapshot();

    const snapshot = await getSnapshot('/');
    expect(snapshot?.body).toBe('<div id="app">Test Content</div>');
    expect(snapshot?.route).toBe('/');
  });

  it('should collect styles', async () => {
    const style1 = document.createElement('style');
    style1.textContent = '.test { color: red; }';
    document.head.appendChild(style1);

    const style2 = document.createElement('style');
    style2.textContent = '.another { font-size: 16px; }';
    document.head.appendChild(style2);

    await captureSnapshot();

    const snapshot = await getSnapshot('/');
    expect(snapshot?.styles).toHaveLength(2);
    expect(snapshot?.styles).toContain('.test { color: red; }');
    expect(snapshot?.styles).toContain('.another { font-size: 16px; }');
  });

  it('should handle empty styles', async () => {
    document.body.innerHTML = '<div>Content</div>';

    await captureSnapshot();

    const snapshot = await getSnapshot('/');
    expect(snapshot?.styles).toBeUndefined();
  });

  it('should capture current route from location.pathname', async () => {
    const originalPathname = window.location.pathname;

    Object.defineProperty(window, 'location', {
      value: { pathname: '/products' },
      writable: true,
    });

    document.body.innerHTML = '<div>Products Page</div>';

    await captureSnapshot();

    const snapshot = await getSnapshot('/products');
    expect(snapshot?.route).toBe('/products');
    expect(snapshot?.body).toBe('<div>Products Page</div>');

    Object.defineProperty(window, 'location', {
      value: { pathname: originalPathname },
      writable: true,
    });
  });

  it('should set timestamp on snapshot', async () => {
    const beforeCapture = Date.now();

    await captureSnapshot();

    const snapshot = await getSnapshot('/');
    const afterCapture = Date.now();

    expect(snapshot?.timestamp).toBeGreaterThanOrEqual(beforeCapture);
    expect(snapshot?.timestamp).toBeLessThanOrEqual(afterCapture);
  });

  it('should log in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleLogSpy = vi.spyOn(console, 'log');

    await captureSnapshot();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[FirstTx] Snapshot captured'),
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle capture errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('DB Error');
    });

    await captureSnapshot();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[FirstTx] Capture failed:', expect.any(Error));
  });
});
