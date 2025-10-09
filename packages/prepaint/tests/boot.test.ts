import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { boot } from '../src/boot';
import { openDB } from '../src/utils';
import { STORAGE_CONFIG, type Snapshot } from '../src/types';

describe('boot', () => {
  let db: IDBDatabase | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-prepaint');
    document.documentElement.removeAttribute('data-prepaint-timestamp');
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

  it('should inject DOM when valid snapshot exists', async () => {
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="test-content">Hello World</div>',
      styles: [],
    };

    await saveSnapshot(snapshot);

    await boot();

    expect(document.body.innerHTML).toBe('<div id="test-content">Hello World</div>');
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(true);
  });

  it('should do nothing when snapshot does not exist', async () => {
    const originalHTML = '<div>Original</div>';
    document.body.innerHTML = originalHTML;

    await boot();

    expect(document.body.innerHTML).toBe(originalHTML);
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
  });

  it('should not inject expired snapshot', async () => {
    const expiredTimestamp = Date.now() - (STORAGE_CONFIG.MAX_SNAPSHOT_AGE + 1000);
    const snapshot: Snapshot = {
      route: '/',
      timestamp: expiredTimestamp,
      body: '<div>Expired</div>',
      styles: [],
    };

    await saveSnapshot(snapshot);

    const originalHTML = '<div>Current</div>';
    document.body.innerHTML = originalHTML;

    await boot();

    expect(document.body.innerHTML).toBe(originalHTML);
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
  });

  it('should inject styles when snapshot has styles', async () => {
    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div>Content</div>',
      styles: ['.test { color: red; }', '.another { font-size: 16px; }'],
    };

    await saveSnapshot(snapshot);

    await boot();

    const styleTags = Array.from(document.head.querySelectorAll('style'));
    const styleContents = styleTags.map((tag) => tag.textContent);

    expect(styleContents).toContain('.test { color: red; }');
    expect(styleContents).toContain('.another { font-size: 16px; }');
  });

  it('should set prepaint timestamp attribute', async () => {
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

  it('should match route from location.pathname', async () => {
    const originalPathname = window.location.pathname;

    Object.defineProperty(window, 'location', {
      value: { pathname: '/cart' },
      writable: true,
    });

    const snapshot: Snapshot = {
      route: '/cart',
      timestamp: Date.now(),
      body: '<div>Cart Content</div>',
      styles: [],
    };

    await saveSnapshot(snapshot);

    await boot();

    expect(document.body.innerHTML).toBe('<div>Cart Content</div>');

    Object.defineProperty(window, 'location', {
      value: { pathname: originalPathname },
      writable: true,
    });
  });

  it('should log in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleLogSpy = vi.spyOn(console, 'log');

    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now() - 5000,
      body: '<div>Content</div>',
      styles: [],
    };

    await saveSnapshot(snapshot);

    await boot();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[FirstTx] Snapshot restored'),
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('DB Error');
    });

    await boot();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[FirstTx] Boot failed:', expect.any(Error));
  });
});
