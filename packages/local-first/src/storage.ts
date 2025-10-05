const STORAGE_CONFIG = {
  DB_NAME: 'fristtx',
  DB_VERSION: 1,
  STORE_MODELS: 'models',
} as const;

/**
 * Storage
 * @description IndexedDB wrapper for persisting models.
 */
class Storage {
  private static instance?: Storage;
  private dbPromise?: Promise<IDBDatabase>;

  static getInstance(): Storage {
    if (!this.instance) this.instance = new Storage();
    return this.instance;
  }

  /** For tests: inject a custom instance (e.g., an in-memory stub). */
  static setInstance(storage: Storage): void {
    this.instance = storage;
  }

  /**
   * getDB
   * @description Lazy-open IndexedDB connection.
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
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

          if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_MODELS)) {
            db.createObjectStore(STORAGE_CONFIG.STORE_MODELS);
          }

          // TODO: Phase 1 - tx_journal, settings stores
        };
      });
    }
    return this.dbPromise;
  }
}

export { Storage };
