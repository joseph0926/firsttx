import type { StoredModel } from './types';

const DB_NAME = 'fristtx';
const DB_VERSION = 1;

export const STORES = {
  MODELS: 'models',
  TX_JOURNAL: 'tx_journal',
  SETTINGS: 'settings',
} as const;

let dbInstance: IDBDatabase | null = null;

/** Open or get cached IndexedDB instance */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to open IndexedDB'));
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.MODELS)) {
        db.createObjectStore(STORES.MODELS);
      }
      if (!db.objectStoreNames.contains(STORES.TX_JOURNAL)) {
        db.createObjectStore(STORES.TX_JOURNAL);
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
      }
    };
  });
}

/**
 * Get model snapshot from IndexedDB (raw, unvalidated)
 * Type safety is caller's responsibility via schema validation
 */
export async function getModelSnapshot<T>(modelName: string): Promise<StoredModel<T> | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MODELS, 'readonly');
    const store = tx.objectStore(STORES.MODELS);
    const request = store.get(modelName);

    request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to get model'));
    request.onsuccess = () => {
      const result = (request as { result: StoredModel<T> | null }).result ?? null;
      resolve(result);
    };
  });
}

/** Save model snapshot to IndexedDB */
export async function saveModelSnapshot<T>(
  modelName: string,
  snapshot: StoredModel<T>,
): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MODELS, 'readwrite');
    const store = tx.objectStore(STORES.MODELS);
    const request = store.put(snapshot, modelName);

    request.onerror = () => reject(new Error(request.error?.message ?? 'Failed to save model'));
    request.onsuccess = () => resolve();
  });
}
