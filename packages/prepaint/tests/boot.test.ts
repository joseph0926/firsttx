import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { boot } from '../src/boot';
import { openDB } from '../src/utils';
import { STORAGE_CONFIG, type Snapshot } from '../src/types';

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

  function mountRoot(inner = '') {
    document.body.innerHTML = `<div id="root">${inner}</div>`;
  }

  it('injects first child into #root when valid snapshot exists', async () => {
    mountRoot('');
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="test-content">Hello World</div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot();
    expect(document.getElementById('root')!.innerHTML).toBe(
      '<div id="test-content">Hello World</div>',
    );
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(true);
  });

  it('does nothing when snapshot does not exist', async () => {
    mountRoot('<div>Original</div>');
    const original = document.getElementById('root')!.innerHTML;
    await boot();
    expect(document.getElementById('root')!.innerHTML).toBe(original);
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
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
    await boot();
    expect(document.getElementById('root')!.innerHTML).toBe('<div>Current</div>');
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
  });

  it('injects styles with prepaint marker when snapshot has styles', async () => {
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
    await boot();
    const els = Array.from(document.head.querySelectorAll('style[data-firsttx-prepaint]'));
    const texts = els.map((e) => e.textContent);
    expect(texts).toContain('.test { color: red; }');
    expect(texts).toContain('.another { font-size: 16px; }');
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
    await boot();
    const texts = Array.from(document.head.querySelectorAll('style[data-firsttx-prepaint]')).map(
      (node) => node.textContent,
    );
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
    await boot();
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
    await boot();
    expect(document.getElementById('root')!.innerHTML).toBe('<div>Cart Content</div>');
    window.history.pushState(null, '', originalPathname || '/');
  });

  it('mounts overlay and marks attributes when overlay is enabled', async () => {
    mountRoot('<div id="original">X</div>');
    window.__FIRSTTX_OVERLAY__ = true;
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="overlay-body">Hello</div>',
      styles: [{ type: 'inline', content: '.x{opacity:1;}' }],
    };
    await saveSnapshot(snapshot);
    await boot();
    expect(document.getElementById('__firsttx_prepaint__')).toBeTruthy();
    expect(document.documentElement.getAttribute('data-prepaint')).toBe('true');
    expect(document.documentElement.getAttribute('data-prepaint-overlay')).toBe('true');
    expect(document.getElementById('root')!.innerHTML).toBe('<div id="original">X</div>');
    delete window.__FIRSTTX_OVERLAY__;
  });

  it('handles errors gracefully', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('DB Error');
    });
    await boot();
    expect(spy).toHaveBeenCalledWith('[FirstTx] Boot failed:', expect.any(Error));
    spy.mockRestore();
  });
});
