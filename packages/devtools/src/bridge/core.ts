import type {
  DevToolsEvent,
  DevToolsCommand,
  CommandResponse,
  DevToolsBridge,
  BridgeConfig,
} from './types';
import { EventPriority } from './types';

const DEFAULT_CONFIG: Required<BridgeConfig> = {
  maxBufferSize: 500,
  persistHighPriority: true,
  normalBatchInterval: 100,
  lowBatchInterval: 500,
  debug: false,
};

const BRIDGE_CHANNEL = 'firsttx-devtools';
const STORAGE_DB_NAME = 'firsttx-devtools-events';
const STORAGE_STORE_NAME = 'high-priority-events';
const STORAGE_VERSION = 1;

class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private size = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = [];
  }

  push(item: T): void {
    const index = (this.head + this.size) % this.capacity;
    this.buffer[index] = item;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  getAll(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }
}

export class FirstTxDevToolsBridge implements DevToolsBridge {
  private config: Required<BridgeConfig>;
  private buffer: CircularBuffer<DevToolsEvent>;
  private channel: BroadcastChannel | null = null;
  private commandHandlers = new Set<(cmd: DevToolsCommand) => Promise<CommandResponse>>();

  private normalQueue: DevToolsEvent[] = [];
  private lowQueue: DevToolsEvent[] = [];
  private normalTimer: ReturnType<typeof setTimeout> | null = null;
  private lowTimer: ReturnType<typeof setTimeout> | null = null;

  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor(config?: BridgeConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buffer = new CircularBuffer(this.config.maxBufferSize);

    this.dbReady = this.initDB();
    this.initChannel();

    if (this.config.debug) {
      console.log('[FirstTx Bridge] Initialized with config:', this.config);
    }
  }

  private initChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[FirstTx Bridge] BroadcastChannel not supported');
      return;
    }

    try {
      this.channel = new BroadcastChannel(BRIDGE_CHANNEL);

      this.channel.addEventListener('message', (event) => {
        this.handleChannelMessage(event.data);
      });

      if (this.config.debug) {
        console.log('[FirstTx Bridge] BroadcastChannel connected');
      }
    } catch (error) {
      console.error('[FirstTx Bridge] Failed to create BroadcastChannel:', error);
    }
  }

  private async initDB(): Promise<void> {
    if (!this.config.persistHighPriority) {
      return;
    }

    if (typeof indexedDB === 'undefined') {
      console.warn('[FirstTx Bridge] IndexedDB not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE_DB_NAME, STORAGE_VERSION);

      request.onerror = () => {
        const error = request.error;
        const message = error
          ? `Failed to open IndexedDB: ${error.message}`
          : 'Failed to open IndexedDB: Unknown error';
        console.error('[FirstTx Bridge]', message);
        reject(new Error(message));
      };

      request.onsuccess = () => {
        this.db = request.result;
        if (this.config.debug) {
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

  emit(event: DevToolsEvent): void {
    this.buffer.push(event);

    switch (event.priority) {
      case EventPriority.HIGH:
        this.emitHigh(event);
        break;
      case EventPriority.NORMAL:
        this.enqueueNormal(event);
        break;
      case EventPriority.LOW:
        this.enqueueLow(event);
        break;
      default:
        this.enqueueNormal(event);
    }
  }

  private emitHigh(event: DevToolsEvent): void {
    this.sendToChannel({ type: 'event', event });

    if (this.config.persistHighPriority) {
      void this.persistEvent(event);
    }

    if (this.config.debug) {
      console.log('[FirstTx Bridge] HIGH priority event:', event);
    }
  }

  private enqueueNormal(event: DevToolsEvent): void {
    this.normalQueue.push(event);

    if (!this.normalTimer) {
      this.normalTimer = setTimeout(() => {
        this.flushNormalQueue();
      }, this.config.normalBatchInterval);
    }
  }

  private enqueueLow(event: DevToolsEvent): void {
    this.lowQueue.push(event);

    if (!this.lowTimer) {
      this.lowTimer = setTimeout(() => {
        this.flushLowQueue();
      }, this.config.lowBatchInterval);
    }
  }

  private flushNormalQueue(): void {
    if (this.normalQueue.length === 0) return;

    this.sendToChannel({
      type: 'batch',
      events: this.normalQueue,
    });

    if (this.config.debug) {
      console.log(`[FirstTx Bridge] Flushed ${this.normalQueue.length} NORMAL events`);
    }

    this.normalQueue = [];
    this.normalTimer = null;
  }

  private flushLowQueue(): void {
    if (this.lowQueue.length === 0) return;

    this.sendToChannel({
      type: 'batch',
      events: this.lowQueue,
    });

    if (this.config.debug) {
      console.log(`[FirstTx Bridge] Flushed ${this.lowQueue.length} LOW events`);
    }

    this.lowQueue = [];
    this.lowTimer = null;
  }

  private sendToChannel(message: unknown): void {
    if (!this.channel) return;

    try {
      this.channel.postMessage(message);
    } catch (error) {
      if (this.config.debug) {
        console.error('[FirstTx Bridge] Failed to send message:', error);
      }
    }
  }

  private handleChannelMessage(message: unknown): void {
    if (!message || typeof message !== 'object') return;

    const msg = message as { type: string; [key: string]: unknown };

    switch (msg.type) {
      case 'command':
        void this.handleCommand(msg.command as DevToolsCommand);
        break;
      case 'buffer-request':
        this.sendBufferedEvents();
        break;
      default:
        if (this.config.debug) {
          console.warn('[FirstTx Bridge] Unknown message type:', msg.type);
        }
    }
  }

  private sendBufferedEvents(): void {
    const events = this.buffer.getAll();

    this.sendToChannel({
      type: 'buffer-dump',
      events,
    });

    if (this.config.debug) {
      console.log(`[FirstTx Bridge] Sent ${events.length} buffered events`);
    }
  }

  onCommand(handler: (command: DevToolsCommand) => Promise<CommandResponse>): () => void {
    this.commandHandlers.add(handler);

    return () => {
      this.commandHandlers.delete(handler);
    };
  }

  private async handleCommand(command: DevToolsCommand): Promise<void> {
    if (this.commandHandlers.size === 0) {
      if (this.config.debug) {
        console.warn('[FirstTx Bridge] No command handlers registered');
      }
      return;
    }

    const promises = Array.from(this.commandHandlers).map((handler) =>
      handler(command).catch((error) => ({
        commandId: command.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })),
    );

    const responses = await Promise.all(promises);
    const successResponse = responses.find((r) => r.success) || responses[0];

    this.sendToChannel({
      type: 'command-response',
      response: successResponse,
    });

    if (this.config.debug) {
      console.log('[FirstTx Bridge] Command handled:', command.type, successResponse);
    }
  }

  private async persistEvent(event: DevToolsEvent): Promise<void> {
    try {
      await this.dbReady;

      if (!this.db) return;

      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORAGE_STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORAGE_STORE_NAME);

          const addRequest = store.add(event);

          addRequest.onerror = () => {
            const error = addRequest.error;
            const message = error
              ? `Failed to persist event: ${error.message}`
              : 'Failed to persist event: Unknown error';
            reject(new Error(message));
          };

          addRequest.onsuccess = () => {
            const countRequest = store.count();

            countRequest.onsuccess = () => {
              if (countRequest.result > 1000) {
                void this.cleanupOldEvents().catch((error) => {
                  if (this.config.debug) {
                    console.warn('[FirstTx Bridge] Cleanup failed:', error);
                  }
                });
              }
            };

            countRequest.onerror = () => {};
          };

          tx.oncomplete = () => {
            resolve();
          };

          tx.onerror = () => {
            const error = tx.error;
            const message = error
              ? `Transaction failed: ${error.message}`
              : 'Transaction failed: Unknown error';
            reject(new Error(message));
          };
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    } catch (error) {
      if (this.config.debug) {
        console.warn('[FirstTx Bridge] Failed to persist event:', error);
      }
    }
  }

  private async cleanupOldEvents(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORAGE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORAGE_STORE_NAME);
        const index = store.index('timestamp');

        let deleteCount = 0;
        const TARGET_DELETE_COUNT = 200;

        const cursorRequest = index.openCursor();

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

          if (cursor && deleteCount < TARGET_DELETE_COUNT) {
            cursor.delete();
            deleteCount++;
            cursor.continue();
          } else {
            if (this.config.debug) {
              console.log(`[FirstTx Bridge] Cleaned up ${deleteCount} old events`);
            }
          }
        };

        cursorRequest.onerror = () => {
          const error = cursorRequest.error;
          const message = error
            ? `Failed to cleanup old events: ${error.message}`
            : 'Failed to cleanup old events: Unknown error';
          reject(new Error(message));
        };

        tx.oncomplete = () => {
          resolve();
        };

        tx.onerror = () => {
          const error = tx.error;
          const message = error
            ? `Transaction failed during cleanup: ${error.message}`
            : 'Transaction failed during cleanup: Unknown error';
          reject(new Error(message));
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  isConnected(): boolean {
    return this.channel !== null;
  }

  getBufferedEvents(): DevToolsEvent[] {
    return this.buffer.getAll();
  }

  clearBuffer(): void {
    this.buffer.clear();
    this.normalQueue = [];
    this.lowQueue = [];

    if (this.normalTimer) {
      clearTimeout(this.normalTimer);
      this.normalTimer = null;
    }

    if (this.lowTimer) {
      clearTimeout(this.lowTimer);
      this.lowTimer = null;
    }
  }

  destroy(): void {
    this.clearBuffer();

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.commandHandlers.clear();

    if (this.config.debug) {
      console.log('[FirstTx Bridge] Destroyed');
    }
  }
}

let bridgeInstance: FirstTxDevToolsBridge | null = null;

export function getDevToolsBridge(config?: BridgeConfig): FirstTxDevToolsBridge {
  if (!bridgeInstance) {
    bridgeInstance = new FirstTxDevToolsBridge(config);
  }
  return bridgeInstance;
}

export function destroyDevToolsBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.destroy();
    bridgeInstance = null;
  }
}
