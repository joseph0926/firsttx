import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { boot } from '../src/boot';
import { openDB } from '../src/utils';
import { STORAGE_CONFIG, type PrepaintPolicy, type Snapshot } from '../src/types';

const TEST_POLICY = {
  routes: ['/', '/cart'],
} satisfies PrepaintPolicy;

describe('boot', () => {
  let db: IDBDatabase | null = null;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-prepaint');
    document.documentElement.removeAttribute('data-prepaint-timestamp');
    document.documentElement.removeAttribute('data-prepaint-overlay');
    localStorage.removeItem('firsttx:overlay');
    localStorage.removeItem('firsttx:overlayRoutes');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    const overlay = document.getElementById('__firsttx_prepaint__');
    if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
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

  async function saveSnapshot(snapshot: Snapshot): Promise<void> {
    db = await openDB();
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    await new Promise<void>((resolve, reject) => {
      const request = store.put(snapshot);
      request.onsuccess = () => resolve();
      // eslint-disable-next-line
      request.onerror = () => reject(request.error);
    });
  }

  async function readSnapshot(route: string): Promise<Snapshot | undefined> {
    const readDb = await openDB();
    const tx = readDb.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    const snapshot = await new Promise<Snapshot | undefined>((resolve) => {
      const request = store.get(route) as IDBRequest<Snapshot>;
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    });
    readDb.close();
    return snapshot;
  }

  function mountRoot(inner = '') {
    document.body.innerHTML = `<div id="root">${inner}</div>`;
  }

  it('mounts the snapshot as an overlay without changing #root', async () => {
    mountRoot('<div id="current-content">Current content</div>');
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="test-content">Hello World</div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot(TEST_POLICY);
    const overlay = document.getElementById('__firsttx_prepaint__');
    expect(overlay?.shadowRoot?.querySelector('#test-content')?.textContent).toBe('Hello World');
    expect(document.getElementById('root')!.innerHTML).toBe(
      '<div id="current-content">Current content</div>',
    );
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(true);
    expect(document.documentElement.getAttribute('data-prepaint-overlay')).toBe('true');
  });

  it('does nothing when snapshot does not exist', async () => {
    mountRoot('<div>Original</div>');
    const original = document.getElementById('root')!.innerHTML;
    await boot(TEST_POLICY);
    expect(document.getElementById('root')!.innerHTML).toBe(original);
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
  });

  it('defaults to off and removes stored snapshots when policy is missing', async () => {
    mountRoot('<div>Current</div>');
    await saveSnapshot({
      route: '/',
      timestamp: Date.now(),
      body: '<div>Stored</div>',
      styles: [],
    });

    await boot(null);

    expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
    expect(await readSnapshot('/')).toBeUndefined();
  });

  it('prunes snapshots outside the exact route allowlist', async () => {
    mountRoot('<div>Current</div>');
    await saveSnapshot({
      route: '/',
      timestamp: Date.now(),
      body: '<div>Stored</div>',
      styles: [],
    });

    await boot({ routes: ['/cart'] });

    expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
    expect(await readSnapshot('/')).toBeUndefined();
  });

  it('does not inject expired snapshot', async () => {
    mountRoot('<div>Current</div>');
    const expiredTimestamp = Date.now() - (STORAGE_CONFIG.MAX_SNAPSHOT_AGE + 1000);
    const snapshot: Snapshot = {
      route: '/',
      timestamp: expiredTimestamp,
      body: '<div>Expired</div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot(TEST_POLICY);
    expect(document.getElementById('root')!.innerHTML).toBe('<div>Current</div>');
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
  });

  it('uses the configured TTL when pruning snapshots', async () => {
    mountRoot('<div>Current</div>');
    await saveSnapshot({
      route: '/',
      timestamp: Date.now() - 2_000,
      body: '<div>Expired by policy</div>',
      styles: [],
    });

    await boot({ routes: ['/'], ttlMs: 1_000 });

    expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
    expect(await readSnapshot('/')).toBeUndefined();
  });

  it('injects styles into the overlay shadow root', async () => {
    mountRoot('<div>Content</div>');
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div>Content</div>',
      styles: [
        { type: 'inline', content: '.test { color: red; }' },
        { type: 'inline', content: '.another { font-size: 16px; }' },
      ],
    };
    await saveSnapshot(snapshot);
    await boot(TEST_POLICY);
    const els = Array.from(
      document.getElementById('__firsttx_prepaint__')!.shadowRoot!.querySelectorAll('style'),
    );
    const texts = els.map((e) => e.textContent);
    expect(texts).toContain('.test { color: red; }');
    expect(texts).toContain('.another { font-size: 16px; }');
  });

  it('prunes styled snapshots when styles are disabled', async () => {
    mountRoot('<div>Current</div>');
    await saveSnapshot({
      route: '/',
      timestamp: Date.now(),
      body: '<div>Stored</div>',
      styles: [{ type: 'inline', content: '.stored { color: red; }' }],
    });

    await boot({ routes: ['/'], includeStyles: false });

    expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
    expect(await readSnapshot('/')).toBeUndefined();
  });

  it('prunes snapshots larger than the configured byte limit', async () => {
    mountRoot('<div>Current</div>');
    await saveSnapshot({
      route: '/',
      timestamp: Date.now(),
      body: '<div>Stored content</div>',
      styles: [],
    });

    await boot({ routes: ['/'], maxSnapshotBytes: 8 });

    expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
    expect(await readSnapshot('/')).toBeUndefined();
  });

  it('normalizes legacy string snapshot styles', async () => {
    mountRoot('<div>Content</div>');
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div>Content</div>',
      styles: ['.legacy { display: block; }'],
    };
    await saveSnapshot(snapshot);
    await boot(TEST_POLICY);
    const texts = Array.from(
      document.getElementById('__firsttx_prepaint__')!.shadowRoot!.querySelectorAll('style'),
    ).map((node) => node.textContent);
    expect(texts).toContain('.legacy { display: block; }');
  });

  it('sets prepaint timestamp attribute', async () => {
    mountRoot('<div>Content</div>');
    const timestamp = Date.now();
    const snapshot: Snapshot = {
      route: '/',
      timestamp,
      body: '<div>Content</div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot(TEST_POLICY);
    expect(document.documentElement.getAttribute('data-prepaint-timestamp')).toBe(
      String(timestamp),
    );
  });

  it('matches route from location.pathname', async () => {
    mountRoot('');
    const originalPathname = window.location.pathname;
    window.history.pushState(null, '', '/cart');
    const snapshot: Snapshot = {
      route: '/cart',
      timestamp: Date.now(),
      body: '<div>Cart Content</div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot(TEST_POLICY);
    expect(document.getElementById('__firsttx_prepaint__')?.shadowRoot?.textContent).toContain(
      'Cart Content',
    );
    expect(document.getElementById('root')!.innerHTML).toBe('');
    window.history.pushState(null, '', originalPathname || '/');
  });

  it('uses overlay restore without an opt-in flag', async () => {
    mountRoot('<div id="original">X</div>');
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="overlay-body">Hello</div>',
      styles: [{ type: 'inline', content: '.x{opacity:1;}' }],
    };
    await saveSnapshot(snapshot);
    await boot(TEST_POLICY);
    expect(document.getElementById('__firsttx_prepaint__')).toBeTruthy();
    expect(document.documentElement.getAttribute('data-prepaint')).toBe('true');
    expect(document.documentElement.getAttribute('data-prepaint-overlay')).toBe('true');
    expect(document.getElementById('root')!.innerHTML).toBe('<div id="original">X</div>');
  });

  describe('Error Handling', () => {
    it('handles IndexedDB open errors gracefully', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
        throw new Error('DB Error');
      });

      await boot(TEST_POLICY);

      expect(spy).toHaveBeenCalled();
      const errorCall = spy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[BootError]');
      expect(errorCall).toContain('db-open');
      expect(errorCall).toContain('Failed to open IndexedDB');

      spy.mockRestore();
    });

    it('recovers from corrupted snapshot data', async () => {
      mountRoot('');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const db = await openDB();
      const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({ route: '/', invalid: 'data' });
        request.onsuccess = () => resolve();
        // eslint-disable-next-line
        request.onerror = () => reject(request.error);
      });
      db.close();

      await boot(TEST_POLICY);

      expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);

      spy.mockRestore();
    });

    it('deletes corrupted snapshot from IndexedDB', async () => {
      mountRoot('');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const db = await openDB();
      const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({ route: '/', invalid: 'data' });
        request.onsuccess = () => resolve();
        // eslint-disable-next-line
        request.onerror = () => reject(request.error);
      });
      db.close();

      await boot(TEST_POLICY);

      const db2 = await openDB();
      const tx2 = db2.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
      const store2 = tx2.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
      const result = await new Promise<unknown>((resolve) => {
        const request = store2.get('/');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      db2.close();

      expect(result).toBeUndefined();

      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('handles overlay mount errors silently', async () => {
      mountRoot('');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div>Content</div>',
        styles: [],
      };
      await saveSnapshot(snapshot);

      vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementationOnce(() => {
        throw new Error('attachShadow failed');
      });

      await boot(TEST_POLICY);

      expect(spy).toHaveBeenCalled();
      const errorCall = spy.mock.calls[0][0] as string;
      expect(errorCall).toContain('[BootError]');
      expect(errorCall).toContain('dom-restore');
      expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);

      spy.mockRestore();
    });

    it('does not throw errors even when everything fails', async () => {
      mountRoot('');
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
        throw new Error('Complete failure');
      });

      await expect(boot(TEST_POLICY)).resolves.not.toThrow();
    });
  });
});
