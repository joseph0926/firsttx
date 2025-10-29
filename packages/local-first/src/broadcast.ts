import { emitModelEvent } from './devtools';

declare const __FIRSTTX_DEV__: boolean;

/**
 * Base fields for all broadcast messages
 */
type BroadcastMessageBase = {
  senderId: string;
  timestamp: number;
};

/**
 * Messages broadcast between tabs for model synchronization
 */
export type BroadcastMessage = BroadcastMessageBase &
  (
    | { type: 'model-patched'; key: string }
    | { type: 'model-replaced'; key: string }
    | { type: 'model-deleted'; key: string }
  );

/**
 * Generates unique sender ID for this tab
 */
function generateSenderId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Fallback implementation when BroadcastChannel is unavailable (SSR, old browsers)
 * Provides no-op methods to allow graceful degradation without crashes
 */
class FallbackChannel {
  postMessage(): void {
    // No-op: Cross-tab synchronization unavailable
  }
  dispatchEvent(): boolean {
    return false; // no-op
  }

  set onmessage(_handler: ((event: MessageEvent) => void) | null) {
    // No-op: Cannot receive messages without BroadcastChannel
  }

  close(): void {
    // No-op: No resources to clean up
  }
}

/**
 * Manages cross-tab model synchronization via BroadcastChannel
 */
class ModelBroadcaster {
  private static instance?: ModelBroadcaster;
  private channel: BroadcastChannel | FallbackChannel;
  private senderId: string;
  private listeners = new Map<string, Set<() => void>>();
  private usingFallback: boolean;

  private constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('firsttx:models');
      this.usingFallback = false;
    } else {
      this.channel = new FallbackChannel();
      this.usingFallback = true;

      if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
        console.warn(
          '[FirstTx] BroadcastChannel is not available. ' +
            'Cross-tab synchronization will not work. ' +
            'Data will sync on page refresh via IndexedDB.',
        );
      }

      emitModelEvent('broadcast.fallback', {
        reason: 'BroadcastChannel not supported',
        environment: typeof window !== 'undefined' ? 'browser' : 'ssr',
      });
    }

    this.senderId = generateSenderId();
    this.setupListener();
  }

  static getInstance(): ModelBroadcaster {
    if (!ModelBroadcaster.instance) {
      ModelBroadcaster.instance = new ModelBroadcaster();
    }
    return ModelBroadcaster.instance;
  }

  /**
   * Subscribe to model changes from other tabs
   */
  subscribe(key: string, callback: () => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
      if (this.listeners.get(key)?.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Broadcast a message to other tabs
   */
  broadcast(message: Omit<BroadcastMessage, 'senderId' | 'timestamp'>): void {
    const fullMessage: BroadcastMessage = {
      ...message,
      senderId: this.senderId,
      timestamp: Date.now(),
    };

    this.channel.postMessage(fullMessage);

    if (this.usingFallback) {
      emitModelEvent('broadcast.skipped', {
        modelName: message.key,
        operation: message.type,
        reason: 'Fallback mode active',
      });
    }
  }

  private setupListener(): void {
    this.channel.onmessage = (event) => {
      const message = event.data as BroadcastMessage;

      if (message.senderId === this.senderId) {
        return;
      }

      emitModelEvent('broadcast', {
        modelName: message.key,
        operation: message.type === 'model-patched' ? 'patch' : 'replace',
        senderId: message.senderId,
        receivedAt: Date.now(),
      });

      const callbacks = this.listeners.get(message.key);
      if (callbacks) {
        callbacks.forEach((callback) => callback());
      }
    };
  }

  /**
   * Close the broadcast channel (cleanup)
   */
  close(): void {
    this.channel.close();
    this.listeners.clear();
  }
}

export { ModelBroadcaster };
