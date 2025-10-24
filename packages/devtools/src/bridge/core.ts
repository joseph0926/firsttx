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

const EXTENSION_MESSAGE_SOURCE = '__FIRSTTX_EXTENSION__';
const BRIDGE_MESSAGE_SOURCE = '__FIRSTTX_BRIDGE__';

interface ExtensionMessage {
  source: typeof EXTENSION_MESSAGE_SOURCE;
  type: 'command' | 'buffer-request' | 'ping';
  data?: unknown;
}

interface BridgeMessage {
  source: typeof BRIDGE_MESSAGE_SOURCE;
  type: 'event' | 'batch' | 'buffer-dump' | 'pong' | 'command-response';
  event?: DevToolsEvent;
  events?: DevToolsEvent[];
  response?: CommandResponse;
  timestamp?: number;
}

function isExtensionMessage(data: unknown): data is ExtensionMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.source === EXTENSION_MESSAGE_SOURCE &&
    typeof msg.type === 'string' &&
    ['command', 'buffer-request', 'ping'].includes(msg.type)
  );
}

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
    this.initWindowMessaging();

    if (this.config.debug) {
      console.log('[FirstTx Bridge] Initialized with config:', this.config);
    }
  }

  private initWindowMessaging(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;

      if (!isExtensionMessage(event.data)) return;

      this.handleExtensionMessage(event.data);
    });

    if (this.config.debug) {
      console.log('[FirstTx Bridge] Window messaging initialized');
    }
  }

  private handleExtensionMessage(message: ExtensionMessage): void {
    switch (message.type) {
      case 'command':
        if (message.data) {
          void this.handleCommand(message.data as DevToolsCommand);
        }
        break;
      case 'buffer-request':
        this.sendBufferedEvents();
        break;
      case 'ping':
        this.sendToExtension({ type: 'pong', timestamp: Date.now() });
        break;
      default:
        if (this.config.debug) {
          console.warn('[FirstTx Bridge] Unknown extension message type:', message.type);
        }
    }
  }

  private sendToExtension(message: Omit<BridgeMessage, 'source'>): void {
    if (typeof window === 'undefined') return;

    try {
      const fullMessage: BridgeMessage = {
        source: BRIDGE_MESSAGE_SOURCE,
        ...message,
      };

      window.postMessage(fullMessage, '*');

      if (this.config.debug) {
        console.log('[FirstTx Bridge] Sent to extension:', fullMessage);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[FirstTx Bridge] Failed to send to extension:', error);
      }
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

    this.sendToExtension({ type: 'event', event });

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
    this.sendToExtension({
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
    this.sendToExtension({
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
        console.error('[FirstTx Bridge] Failed to send to channel:', error);
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
    this.sendToExtension({
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

    const response = responses.find((r) => r.success) || responses[0];

    if (response) {
      this.sendToExtension({
        type: 'command-response',
        response,
      });

      this.sendToChannel({
        type: 'command-response',
        response,
      });
    }
  }

  private async persistEvent(event: DevToolsEvent): Promise<void> {
    if (!this.db) {
      await this.dbReady;
      if (!this.db) return;
    }

    try {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORAGE_STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORAGE_STORE_NAME);

          const addRequest = store.add(event);

          addRequest.onsuccess = () => {
            if (this.config.debug) {
              console.log('[FirstTx Bridge] Persisted HIGH priority event:', event.id);
            }
            resolve();
          };

          addRequest.onerror = () => {
            const error = addRequest.error;
            const message = error
              ? `Failed to persist event: ${error.message}`
              : 'Failed to persist event: Unknown error';
            reject(new Error(message));
          };

          tx.oncomplete = () => {
            void this.cleanupOldEvents();
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
