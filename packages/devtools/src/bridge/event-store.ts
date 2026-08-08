import type { DevToolsEvent } from './types';

export const STORAGE_DB_NAME = 'firsttx-devtools-events';
export const STORAGE_STORE_NAME = 'high-priority-events';
export const STORAGE_VERSION = 1;
export const MAX_PERSISTED_EVENTS = 500;

export interface EventStore {
  ready(): Promise<void>;
  persist(event: DevToolsEvent): Promise<void>;
  close(): void;
}

export interface EventStoreOptions {
  maxEvents?: number;
  debug?: boolean;
}

function toMessage(error: DOMException | Error | null, fallback: string): string {
  return error ? `${fallback}: ${error.message}` : `${fallback}: Unknown error`;
}

export class IndexedDBEventStore implements EventStore {
  private db: IDBDatabase | null = null;
  private readonly opening: Promise<void>;
  private readonly maxEvents: number;
  private readonly debug: boolean;

  constructor(options: EventStoreOptions = {}) {
    this.maxEvents = options.maxEvents ?? MAX_PERSISTED_EVENTS;
    this.debug = options.debug ?? false;
    this.opening = this.open();
  }

  ready(): Promise<void> {
    return this.opening;
  }

  async persist(event: DevToolsEvent): Promise<void> {
    await this.opening;

    const db = this.db;
    if (!db) return;

    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORAGE_STORE_NAME, 'readwrite');
        const addRequest = tx.objectStore(STORAGE_STORE_NAME).add(event);

        addRequest.onerror = () => {
          reject(new Error(toMessage(addRequest.error, 'Failed to persist event')));
        };

        tx.oncomplete = () => {
          if (this.debug) {
            console.log('[FirstTx Bridge] Persisted HIGH priority event:', event.id);
          }
          resolve();
        };

        tx.onerror = () => {
          reject(new Error(toMessage(tx.error, 'Transaction failed')));
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    await this.trim();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private open(): Promise<void> {
    return new Promise((resolve) => {
      let request: IDBOpenDBRequest;

      try {
        request = indexedDB.open(STORAGE_DB_NAME, STORAGE_VERSION);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[FirstTx Bridge]', `Failed to open IndexedDB: ${message}`);
        resolve();
        return;
      }

      request.onerror = () => {
        console.error('[FirstTx Bridge]', toMessage(request.error, 'Failed to open IndexedDB'));
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        if (this.debug) {
          console.log('[FirstTx Bridge] IndexedDB ready');
        }
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
          const store = db.createObjectStore(STORAGE_STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }

  private trim(): Promise<void> {
    const db = this.db;
    if (!db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORAGE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORAGE_STORE_NAME);
        const countRequest = store.count();

        countRequest.onerror = () => {
          reject(new Error(toMessage(countRequest.error, 'Failed to count persisted events')));
        };

        countRequest.onsuccess = () => {
          const excess = countRequest.result - this.maxEvents;
          if (excess <= 0) return;

          let deleted = 0;
          const cursorRequest = store.index('timestamp').openCursor();

          cursorRequest.onerror = () => {
            reject(new Error(toMessage(cursorRequest.error, 'Failed to cleanup old events')));
          };

          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!cursor || deleted >= excess) {
              if (this.debug) {
                console.log(`[FirstTx Bridge] Cleaned up ${deleted} old events`);
              }
              return;
            }

            cursor.delete();
            deleted++;
            cursor.continue();
          };
        };

        tx.oncomplete = () => {
          resolve();
        };

        tx.onerror = () => {
          reject(new Error(toMessage(tx.error, 'Transaction failed during cleanup')));
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}

export function createEventStore(options: EventStoreOptions = {}): EventStore | null {
  if (typeof indexedDB === 'undefined') {
    console.warn('[FirstTx Bridge] IndexedDB not supported');
    return null;
  }

  return new IndexedDBEventStore(options);
}
