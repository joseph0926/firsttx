import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  IndexedDBEventStore,
  createEventStore,
  STORAGE_DB_NAME,
  STORAGE_STORE_NAME,
  STORAGE_VERSION,
} from '../../src/bridge/event-store';
import { EventPriority } from '../../src/bridge/types';
import type { DevToolsEvent, SystemErrorEvent } from '../../src/bridge/types';

function errorEvent(id: string, timestamp: number): SystemErrorEvent {
  return {
    id,
    category: 'system',
    type: 'error',
    timestamp,
    priority: EventPriority.HIGH,
    data: { error: `boom-${id}` },
  };
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(STORAGE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function readAll(): Promise<DevToolsEvent[]> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(STORAGE_DB_NAME, STORAGE_VERSION);

    openRequest.onerror = () => reject(openRequest.error ?? new Error('open failed'));
    openRequest.onsuccess = () => {
      const db = openRequest.result;

      if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
        db.close();
        resolve([]);
        return;
      }

      const tx = db.transaction(STORAGE_STORE_NAME, 'readonly');
      const getAll = tx.objectStore(STORAGE_STORE_NAME).index('timestamp').getAll();

      getAll.onerror = () => reject(getAll.error ?? new Error('getAll failed'));
      tx.oncomplete = () => {
        db.close();
        resolve(getAll.result as DevToolsEvent[]);
      };
    };
  });
}

describe('IndexedDBEventStore', () => {
  let store: IndexedDBEventStore | null = null;

  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    store?.close();
    store = null;
    await deleteDatabase();
  });

  it('should create the object store and resolve ready()', async () => {
    store = new IndexedDBEventStore();

    await expect(store.ready()).resolves.toBeUndefined();
    await expect(readAll()).resolves.toEqual([]);
  });

  it('should persist an event so it can be read back', async () => {
    store = new IndexedDBEventStore();

    await store.persist(errorEvent('a', 1));

    const rows = await readAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'a', category: 'system', type: 'error' });
  });

  it('should keep the newest events and drop the oldest once maxEvents is exceeded', async () => {
    store = new IndexedDBEventStore({ maxEvents: 2 });

    await store.persist(errorEvent('a', 1));
    await store.persist(errorEvent('b', 2));
    await store.persist(errorEvent('c', 3));
    await store.persist(errorEvent('d', 4));

    const rows = await readAll();
    expect(rows.map((row) => row.id)).toEqual(['c', 'd']);
  });

  it('should not delete anything while the store stays within maxEvents', async () => {
    store = new IndexedDBEventStore({ maxEvents: 5 });

    await store.persist(errorEvent('a', 1));
    await store.persist(errorEvent('b', 2));
    await store.persist(errorEvent('c', 3));

    const rows = await readAll();
    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('should reject when the same event id is persisted twice', async () => {
    store = new IndexedDBEventStore();

    await store.persist(errorEvent('a', 1));

    await expect(store.persist(errorEvent('a', 2))).rejects.toThrow(/Failed to persist event/);
  });

  it('should become a no-op after close()', async () => {
    store = new IndexedDBEventStore();
    await store.ready();
    store.close();

    await expect(store.persist(errorEvent('a', 1))).resolves.toBeUndefined();
    await expect(readAll()).resolves.toEqual([]);
  });
});

describe('createEventStore', () => {
  it('should return a store when IndexedDB is available', async () => {
    const store = createEventStore();

    expect(store).not.toBeNull();
    await store?.ready();
    store?.close();
    await deleteDatabase();
  });

  it('should return null and warn when IndexedDB is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = globalThis.indexedDB;

    try {
      Reflect.deleteProperty(globalThis, 'indexedDB');

      expect(createEventStore()).toBeNull();
      expect(warn).toHaveBeenCalledWith('[FirstTx Bridge] IndexedDB not supported');
    } finally {
      globalThis.indexedDB = original;
      warn.mockRestore();
    }
  });
});
