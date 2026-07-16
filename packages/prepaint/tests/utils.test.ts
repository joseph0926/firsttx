import { describe, it, expect, afterEach } from 'vitest';
import { openDB } from '../src/utils';
import { STORAGE_CONFIG } from '../src/types';

describe('openDB', () => {
  let db: IDBDatabase | null = null;

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

  it('should open database successfully', async () => {
    db = await openDB();

    expect(db).toBeDefined();
    expect(db.name).toBe(STORAGE_CONFIG.DB_NAME);
    expect(db.version).toBe(STORAGE_CONFIG.DB_VERSION);
  });

  it('should create snapshots object store', async () => {
    db = await openDB();

    const storeNames = Array.from(db.objectStoreNames);
    expect(storeNames).toContain(STORAGE_CONFIG.STORE_SNAPSHOTS);
  });

  it('should have correct keyPath', async () => {
    db = await openDB();

    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);

    expect(store.keyPath).toBe('route');
  });

  it('should reuse existing database', async () => {
    const db1 = await openDB();
    db1.close();

    db = await openDB();

    expect(db.version).toBe(STORAGE_CONFIG.DB_VERSION);
  });

  it('should purge version 1 snapshots during the version 2 upgrade', async () => {
    const legacyRequest = indexedDB.open(STORAGE_CONFIG.DB_NAME, 1);
    const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
      legacyRequest.onupgradeneeded = () => {
        legacyRequest.result.createObjectStore(STORAGE_CONFIG.STORE_SNAPSHOTS, {
          keyPath: 'route',
        });
      };
      legacyRequest.onsuccess = () => resolve(legacyRequest.result);
      legacyRequest.onerror = () =>
        reject(legacyRequest.error ?? new Error('Failed to open legacy database'));
    });

    await new Promise<void>((resolve, reject) => {
      const tx = legacyDb.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readwrite');
      const request = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS).put({
        route: '/',
        body: '<div>Legacy</div>',
        timestamp: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to store legacy snapshot'));
    });
    legacyDb.close();

    db = await openDB();

    const stored = await new Promise<unknown>((resolve, reject) => {
      const tx = db!.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
      const request = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS).get('/');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to read migrated snapshot'));
    });

    expect(stored).toBeUndefined();
  });
});
