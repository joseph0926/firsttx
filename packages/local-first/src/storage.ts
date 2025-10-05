import type { StoredModel } from './types';

const STORAGE_CONFIG = {
  DB_NAME: 'firsttx',
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
  static setInstance(storage: Storage | undefined): void {
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
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            try {
              db.close();
            } catch {}
          };
          resolve(db);
        };

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

  async get<T>(key: string): Promise<StoredModel<T> | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.STORE_MODELS, 'readonly');
      const store = tx.objectStore(STORAGE_CONFIG.STORE_MODELS);
      const request = store.get(key) as IDBRequest<StoredModel<T>>;

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        const err = request.error;

        if (err) {
          reject(new Error(`Failed to get key "${key}": ${err.message}`, { cause: err }));
        } else {
          reject(new Error(`Failed to get key "${key}": Unknown error`));
        }
      };
    });
  }

  async set<T>(key: string, value: StoredModel<T>): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.STORE_MODELS, 'readwrite');
      const store = tx.objectStore(STORAGE_CONFIG.STORE_MODELS);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        const err = request.error;

        if (err) {
          reject(new Error(`Failed to set key "${key}": ${err.message}`, { cause: err }));
        } else {
          reject(new Error(`Failed to set key "${key}": Unknown error`));
        }
      };
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.STORE_MODELS, 'readwrite');
      const store = tx.objectStore(STORAGE_CONFIG.STORE_MODELS);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        const err = request.error;

        if (err) {
          reject(new Error(`Failed to delete key "${key}": ${err.message}`, { cause: err }));
        } else {
          reject(new Error(`Failed to delete key "${key}": Unknown error`));
        }
      };
    });
  }
}

export { Storage };
