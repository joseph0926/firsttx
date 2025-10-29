import { STORAGE_CONFIG } from './types';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_CONFIG.DB_NAME, STORAGE_CONFIG.DB_VERSION);

    request.onerror = () => {
      const err = request.error;
      if (err) {
        reject(new Error(`IndexedDB error: ${err.message}`, { cause: err }));
      } else {
        reject(new Error('Unknown IndexedDB error'));
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_SNAPSHOTS)) {
        db.createObjectStore(STORAGE_CONFIG.STORE_SNAPSHOTS, { keyPath: 'route' });
      }
    };
  });
}

/**
 * Checks if ViewTransition API is available
 * @returns true if document exists and supports ViewTransition
 */
export function supportsViewTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof document.startViewTransition === 'function'
  );
}
