import type {
  DevToolsEvent,
  DevToolsCommand,
  CommandResponse,
  DevToolsBridge,
  BridgeConfig,
} from './types';
import { EventPriority } from './types';
import { CircularBuffer } from './circular-buffer';
import { createEventStore, type EventStore } from './event-store';
import {
  BRIDGE_CHANNEL,
  BRIDGE_MESSAGE_SOURCE,
  getCurrentOrigin,
  isExtensionMessage,
  type BridgeMessage,
  type ExtensionMessage,
} from './messaging';

const DEFAULT_CONFIG: Required<BridgeConfig> = {
  maxBufferSize: 500,
  persistHighPriority: true,
  normalBatchInterval: 100,
  lowBatchInterval: 500,
  debug: false,
};

export class FirstTxDevToolsBridge implements DevToolsBridge {
  private config: Required<BridgeConfig>;
  private buffer: CircularBuffer<DevToolsEvent>;
  private channel: BroadcastChannel | null = null;
  private commandHandlers = new Set<(cmd: DevToolsCommand) => Promise<CommandResponse>>();

  private normalQueue: DevToolsEvent[] = [];
  private lowQueue: DevToolsEvent[] = [];
  private normalTimer: ReturnType<typeof setTimeout> | null = null;
  private lowTimer: ReturnType<typeof setTimeout> | null = null;

  private store: EventStore | null = null;
  private windowMessageListener: ((event: MessageEvent) => void) | null = null;

  constructor(config?: BridgeConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buffer = new CircularBuffer(this.config.maxBufferSize);

    if (this.config.persistHighPriority) {
      this.store = createEventStore({ debug: this.config.debug });
    }

    this.initChannel();
    this.initWindowMessaging();

    if (this.config.debug) {
      console.log('[FirstTx Bridge] Initialized with config:', this.config);
    }
  }

  private initWindowMessaging(): void {
    if (typeof window === 'undefined') return;

    this.windowMessageListener = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (!isExtensionMessage(event.data)) return;

      this.handleExtensionMessage(event.data);
    };

    window.addEventListener('message', this.windowMessageListener);

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

      window.postMessage(fullMessage, getCurrentOrigin());

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

    if (this.store) {
      void this.store.persist(event).catch((error: unknown) => {
        if (this.config.debug) {
          console.warn('[FirstTx Bridge] Failed to persist event:', error);
        }
      });
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
    this.normalTimer = null;

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
  }

  private flushLowQueue(): void {
    this.lowTimer = null;

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
      Promise.resolve()
        .then(() => handler(command))
        .catch((error: unknown) => ({
          commandId: command?.id,
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

    if (this.windowMessageListener && typeof window !== 'undefined') {
      window.removeEventListener('message', this.windowMessageListener);
      this.windowMessageListener = null;
    }

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (this.store) {
      this.store.close();
      this.store = null;
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
