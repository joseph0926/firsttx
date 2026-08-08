import {
  convertDOMException,
  StorageError,
  type StorageErrorContext,
  type StorageOperation,
} from './errors';
import type { StoredModel, TxJournalEntry } from './types';

const STORAGE_CONFIG = {
  DB_NAME: 'firsttx-local-first',
  DB_VERSION: 2,
  STORE_MODELS: 'models',
  STORE_TX_JOURNAL: 'tx_journal',
  STORE_SETTINGS: 'settings',
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
          this.dbPromise = undefined;

          if (err) {
            reject(convertDOMException(err, { operation: 'open' }));
          } else {
            reject(
              new StorageError(
                '[FirstTx] Failed to open IndexedDB: Unknown error',
                'UNKNOWN',
                true,
                {
                  operation: 'open',
                },
              ),
            );
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            console.log('[FirstTx] Database version changed, closing connection');
            db.close();
            this.dbPromise = undefined;
          };
          resolve(db);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_MODELS)) {
            db.createObjectStore(STORAGE_CONFIG.STORE_MODELS);
          }

          if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_TX_JOURNAL)) {
            db.createObjectStore(STORAGE_CONFIG.STORE_TX_JOURNAL, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_SETTINGS)) {
            db.createObjectStore(STORAGE_CONFIG.STORE_SETTINGS);
          }
        };
      });
    }
    return this.dbPromise;
  }

  private async run<R>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: StorageOperation,
    key: string | undefined,
    exec: (store: IDBObjectStore) => IDBRequest,
  ): Promise<R> {
    const db = await this.getDB();

    return new Promise<R>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = exec(tx.objectStore(storeName));

      request.onsuccess = () => {
        resolve(request.result as R);
      };

      request.onerror = () => {
        const err = request.error;
        const context: StorageErrorContext = { key, operation };
        const target = key ? `key "${key}"` : `store "${storeName}"`;

        if (err) {
          reject(convertDOMException(err, context));
        } else {
          reject(
            new StorageError(
              `Failed to ${operation} ${target}: Unknown error`,
              'UNKNOWN',
              true,
              context,
            ),
          );
        }
      };
    });
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
          reject(convertDOMException(err, { key, operation: 'get' }));
        } else {
          reject(
            new StorageError(`Failed to get key "${key}": Unknown error`, 'UNKNOWN', true, {
              key,
              operation: 'get',
            }),
          );
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
          reject(convertDOMException(err, { key, operation: 'set' }));
        } else {
          reject(
            new StorageError(`Failed to set key "${key}": Unknown error`, 'UNKNOWN', true, {
              key,
              operation: 'set',
            }),
          );
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
          reject(convertDOMException(err, { key, operation: 'delete' }));
        } else {
          reject(
            new StorageError(`Failed to delete key "${key}": Unknown error`, 'UNKNOWN', true, {
              key,
              operation: 'delete',
            }),
          );
        }
      };
    });
  }

  async putJournalEntry<T>(entry: TxJournalEntry<T>): Promise<void> {
    await this.run<IDBValidKey>(
      STORAGE_CONFIG.STORE_TX_JOURNAL,
      'readwrite',
      'set',
      entry.id,
      (store) => store.put(entry),
    );
  }

  async getJournalEntries<T>(): Promise<TxJournalEntry<T>[]> {
    const entries = await this.run<TxJournalEntry<T>[] | undefined>(
      STORAGE_CONFIG.STORE_TX_JOURNAL,
      'readonly',
      'get',
      undefined,
      (store) => store.getAll(),
    );

    return entries ?? [];
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await this.run<undefined>(STORAGE_CONFIG.STORE_TX_JOURNAL, 'readwrite', 'delete', id, (store) =>
      store.delete(id),
    );
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const value = await this.run<T | undefined>(
      STORAGE_CONFIG.STORE_SETTINGS,
      'readonly',
      'get',
      key,
      (store) => store.get(key),
    );

    return value ?? null;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.run<IDBValidKey>(STORAGE_CONFIG.STORE_SETTINGS, 'readwrite', 'set', key, (store) =>
      store.put(value, key),
    );
  }
}

export { Storage };
