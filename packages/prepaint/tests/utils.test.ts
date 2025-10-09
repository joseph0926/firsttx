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
});
