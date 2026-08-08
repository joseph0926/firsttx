import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FirstTxDevToolsBridge,
  getDevToolsBridge,
  destroyDevToolsBridge,
} from '../../src/bridge/core';
import { STORAGE_DB_NAME, STORAGE_STORE_NAME, STORAGE_VERSION } from '../../src/bridge/event-store';
import {
  BRIDGE_MESSAGE_SOURCE,
  EXTENSION_MESSAGE_SOURCE,
  type BridgeMessage,
} from '../../src/bridge/messaging';
import { EventPriority } from '../../src/bridge/types';
import type {
  CommandResponse,
  DevToolsCommand,
  DevToolsEvent,
  SystemErrorEvent,
  SystemReadyEvent,
} from '../../src/bridge/types';

type ChannelListener = (event: MessageEvent) => void;

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = [];

  readonly name: string;
  readonly posted: unknown[] = [];
  closed = false;

  private listeners = new Set<ChannelListener>();

  constructor(name: string) {
    this.name = name;
    TestBroadcastChannel.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  addEventListener(type: string, listener: ChannelListener): void {
    if (type === 'message') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: ChannelListener): void {
    this.listeners.delete(listener);
  }

  close(): void {
    this.closed = true;
    this.listeners.clear();
  }

  receive(data: unknown): void {
    const event = new MessageEvent('message', { data });
    this.listeners.forEach((listener) => listener(event));
  }
}

function readyEvent(id: string, priority: EventPriority): SystemReadyEvent {
  return {
    id,
    category: 'system',
    type: 'ready',
    timestamp: 1700000000000,
    priority,
    data: {
      version: '0.1.0',
      hasIndexedDB: true,
      hasViewTransition: false,
      hasBroadcastChannel: true,
    },
  };
}

function errorEvent(id: string): SystemErrorEvent {
  return {
    id,
    category: 'system',
    type: 'error',
    timestamp: 1700000000000,
    priority: EventPriority.HIGH,
    data: { error: `boom-${id}` },
  };
}

function pingCommand(id: string): DevToolsCommand {
  return { id, type: 'ping', timestamp: 1700000000000 };
}

function okResponse(commandId: string): CommandResponse {
  return { commandId, success: true, timestamp: 1700000000000 };
}

function postFromExtension(message: { type: string; data?: unknown }): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { source: EXTENSION_MESSAGE_SOURCE, ...message },
      source: window,
    }),
  );
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(STORAGE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function readPersistedIds(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(STORAGE_DB_NAME, STORAGE_VERSION);

    openRequest.onerror = () => reject(openRequest.error ?? new Error('open failed'));
    openRequest.onsuccess = () => {
      const db = openRequest.result;

      if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
        db.close();
        resolve([]);
        return;
      }

      const tx = db.transaction(STORAGE_STORE_NAME, 'readonly');
      const getAll = tx.objectStore(STORAGE_STORE_NAME).getAll();

      getAll.onerror = () => reject(getAll.error ?? new Error('getAll failed'));
      tx.oncomplete = () => {
        db.close();
        resolve((getAll.result as DevToolsEvent[]).map((event) => event.id));
      };
    };
  });
}

const OriginalBroadcastChannel = globalThis.BroadcastChannel;

let windowMessages: BridgeMessage[] = [];
let postMessageSpy: { mockRestore: () => void };
let bridges: FirstTxDevToolsBridge[] = [];

function createBridge(config?: ConstructorParameters<typeof FirstTxDevToolsBridge>[0]) {
  const bridge = new FirstTxDevToolsBridge({ persistHighPriority: false, ...config });
  bridges.push(bridge);
  return bridge;
}

function channel(): TestBroadcastChannel {
  const instance = TestBroadcastChannel.instances.at(-1);
  if (!instance) throw new Error('no BroadcastChannel was created');
  return instance;
}

function channelMessages(): BridgeMessage[] {
  return channel().posted as BridgeMessage[];
}

beforeEach(() => {
  TestBroadcastChannel.instances = [];
  globalThis.BroadcastChannel = TestBroadcastChannel as unknown as typeof BroadcastChannel;

  windowMessages = [];
  postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((message: unknown) => {
    windowMessages.push(message as BridgeMessage);
  });
});

afterEach(() => {
  bridges.forEach((bridge) => {
    bridge.destroy();
  });
  bridges = [];
  destroyDevToolsBridge();
  postMessageSpy.mockRestore();
  globalThis.BroadcastChannel = OriginalBroadcastChannel;
  vi.useRealTimers();
});

describe('FirstTxDevToolsBridge - emit', () => {
  it('should send HIGH priority events immediately to channel and extension', () => {
    const bridge = createBridge();

    bridge.emit(errorEvent('e1'));

    expect(channelMessages()).toEqual([{ type: 'event', event: errorEvent('e1') }]);
    expect(windowMessages).toEqual([
      { source: BRIDGE_MESSAGE_SOURCE, type: 'event', event: errorEvent('e1') },
    ]);
  });

  it('should batch NORMAL events until the normal interval elapses', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const bridge = createBridge({ normalBatchInterval: 100 });

    bridge.emit(readyEvent('n1', EventPriority.NORMAL));
    bridge.emit(readyEvent('n2', EventPriority.NORMAL));

    expect(channelMessages()).toEqual([]);

    vi.advanceTimersByTime(100);

    expect(channelMessages()).toEqual([
      {
        type: 'batch',
        events: [readyEvent('n1', EventPriority.NORMAL), readyEvent('n2', EventPriority.NORMAL)],
      },
    ]);
    expect(windowMessages).toHaveLength(1);
    expect(windowMessages[0]).toMatchObject({ source: BRIDGE_MESSAGE_SOURCE, type: 'batch' });
  });

  it('should start a fresh batch window after a flush', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const bridge = createBridge({ normalBatchInterval: 100 });

    bridge.emit(readyEvent('n1', EventPriority.NORMAL));
    vi.advanceTimersByTime(100);
    bridge.emit(readyEvent('n2', EventPriority.NORMAL));
    vi.advanceTimersByTime(100);

    expect(channelMessages()).toEqual([
      { type: 'batch', events: [readyEvent('n1', EventPriority.NORMAL)] },
      { type: 'batch', events: [readyEvent('n2', EventPriority.NORMAL)] },
    ]);
  });

  it('should batch LOW events on the low interval, separately from NORMAL events', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const bridge = createBridge({ normalBatchInterval: 100, lowBatchInterval: 500 });

    bridge.emit(readyEvent('l1', EventPriority.LOW));
    bridge.emit(readyEvent('n1', EventPriority.NORMAL));

    vi.advanceTimersByTime(100);
    expect(channelMessages()).toEqual([
      { type: 'batch', events: [readyEvent('n1', EventPriority.NORMAL)] },
    ]);

    vi.advanceTimersByTime(400);
    expect(channelMessages()).toEqual([
      { type: 'batch', events: [readyEvent('n1', EventPriority.NORMAL)] },
      { type: 'batch', events: [readyEvent('l1', EventPriority.LOW)] },
    ]);
  });

  it('should treat an unknown priority as NORMAL', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const bridge = createBridge({ normalBatchInterval: 100 });
    const event = readyEvent('u1', 42 as EventPriority);

    bridge.emit(event);
    vi.advanceTimersByTime(100);

    expect(channelMessages()).toEqual([{ type: 'batch', events: [event] }]);
  });

  it('should not throw when BroadcastChannel is unavailable and still reach the extension', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Reflect.deleteProperty(globalThis, 'BroadcastChannel');

    const bridge = createBridge();

    expect(bridge.isConnected()).toBe(false);
    expect(() => {
      bridge.emit(errorEvent('e1'));
    }).not.toThrow();
    expect(windowMessages).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith('[FirstTx Bridge] BroadcastChannel not supported');

    warn.mockRestore();
  });
});

describe('FirstTxDevToolsBridge - buffer', () => {
  it('should buffer every event regardless of priority', () => {
    const bridge = createBridge({ normalBatchInterval: 10_000, lowBatchInterval: 10_000 });

    bridge.emit(errorEvent('e1'));
    bridge.emit(readyEvent('n1', EventPriority.NORMAL));
    bridge.emit(readyEvent('l1', EventPriority.LOW));

    expect(bridge.getBufferedEvents().map((event) => event.id)).toEqual(['e1', 'n1', 'l1']);
  });

  it('should drop the oldest events beyond maxBufferSize', () => {
    const bridge = createBridge({ maxBufferSize: 2, normalBatchInterval: 10_000 });

    bridge.emit(readyEvent('n1', EventPriority.NORMAL));
    bridge.emit(readyEvent('n2', EventPriority.NORMAL));
    bridge.emit(readyEvent('n3', EventPriority.NORMAL));

    expect(bridge.getBufferedEvents().map((event) => event.id)).toEqual(['n2', 'n3']);
  });

  it('should drop buffered events and pending batches on clearBuffer', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const bridge = createBridge({ normalBatchInterval: 100, lowBatchInterval: 500 });

    bridge.emit(readyEvent('n1', EventPriority.NORMAL));
    bridge.emit(readyEvent('l1', EventPriority.LOW));
    bridge.clearBuffer();

    vi.advanceTimersByTime(1000);

    expect(bridge.getBufferedEvents()).toEqual([]);
    expect(channelMessages()).toEqual([]);
    expect(windowMessages).toEqual([]);
  });

  it('should answer a buffer-request with the buffered events', () => {
    const bridge = createBridge({ normalBatchInterval: 10_000 });
    bridge.emit(errorEvent('e1'));
    windowMessages = [];

    postFromExtension({ type: 'buffer-request' });

    expect(windowMessages).toEqual([
      { source: BRIDGE_MESSAGE_SOURCE, type: 'buffer-dump', events: [errorEvent('e1')] },
    ]);
    expect(channelMessages()).toContainEqual({
      type: 'buffer-dump',
      events: [errorEvent('e1')],
    });
  });
});

describe('FirstTxDevToolsBridge - extension messaging', () => {
  it('should reply to ping with pong', () => {
    createBridge();

    postFromExtension({ type: 'ping' });

    expect(windowMessages).toEqual([
      { source: BRIDGE_MESSAGE_SOURCE, type: 'pong', timestamp: Date.now() },
    ]);
  });

  it('should ignore messages from another source', () => {
    createBridge();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: 'somebody-else', type: 'ping' },
        source: window,
      }),
    );

    expect(windowMessages).toEqual([]);
  });

  it('should ignore extension messages that did not come from this window', () => {
    createBridge();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: EXTENSION_MESSAGE_SOURCE, type: 'ping' },
      }),
    );

    expect(windowMessages).toEqual([]);
  });

  it('should ignore unknown extension message types', () => {
    createBridge();

    postFromExtension({ type: 'nonsense' });

    expect(windowMessages).toEqual([]);
  });

  it('should stop responding after destroy', () => {
    const bridge = createBridge();

    bridge.destroy();
    postFromExtension({ type: 'ping' });

    expect(windowMessages).toEqual([]);
  });
});

describe('FirstTxDevToolsBridge - commands', () => {
  it('should run a registered handler for an extension command and broadcast the response', async () => {
    const bridge = createBridge();
    const handler = vi.fn((command: DevToolsCommand) => Promise.resolve(okResponse(command.id)));
    bridge.onCommand(handler);

    postFromExtension({ type: 'command', data: pingCommand('cmd-1') });
    await vi.waitFor(() => {
      expect(windowMessages).toHaveLength(1);
    });

    expect(handler).toHaveBeenCalledWith(pingCommand('cmd-1'));
    expect(windowMessages[0]).toEqual({
      source: BRIDGE_MESSAGE_SOURCE,
      type: 'command-response',
      response: okResponse('cmd-1'),
    });
    expect(channelMessages()).toContainEqual({
      type: 'command-response',
      response: okResponse('cmd-1'),
    });
  });

  it('should run a registered handler for a command received over the channel', async () => {
    const bridge = createBridge();
    const handler = vi.fn((command: DevToolsCommand) => Promise.resolve(okResponse(command.id)));
    bridge.onCommand(handler);

    channel().receive({ type: 'command', command: pingCommand('cmd-2') });
    await vi.waitFor(() => {
      expect(windowMessages).toHaveLength(1);
    });

    expect(handler).toHaveBeenCalledWith(pingCommand('cmd-2'));
  });

  it('should stop calling a handler after its unsubscribe is invoked', async () => {
    const bridge = createBridge();
    const handler = vi.fn((command: DevToolsCommand) => Promise.resolve(okResponse(command.id)));
    const unsubscribe = bridge.onCommand(handler);

    unsubscribe();
    postFromExtension({ type: 'command', data: pingCommand('cmd-3') });
    await Promise.resolve();

    expect(handler).not.toHaveBeenCalled();
    expect(windowMessages).toEqual([]);
  });

  it('should send nothing when no handler is registered', async () => {
    createBridge();

    postFromExtension({ type: 'command', data: pingCommand('cmd-4') });
    await Promise.resolve();

    expect(windowMessages).toEqual([]);
    expect(channelMessages()).toEqual([]);
  });

  it('should turn a rejected handler into a failure response', async () => {
    const bridge = createBridge();
    bridge.onCommand(() => Promise.reject(new Error('handler exploded')));

    postFromExtension({ type: 'command', data: pingCommand('cmd-5') });
    await vi.waitFor(() => {
      expect(windowMessages).toHaveLength(1);
    });

    expect(windowMessages[0]?.response).toEqual({
      commandId: 'cmd-5',
      success: false,
      error: 'handler exploded',
      timestamp: Date.now(),
    });
  });

  it('should turn a synchronously throwing handler into a failure response', async () => {
    const bridge = createBridge();
    bridge.onCommand(() => {
      throw new Error('sync boom');
    });

    postFromExtension({ type: 'command', data: pingCommand('cmd-6') });
    await vi.waitFor(() => {
      expect(windowMessages).toHaveLength(1);
    });

    expect(windowMessages[0]?.response).toMatchObject({
      commandId: 'cmd-6',
      success: false,
      error: 'sync boom',
    });
  });

  it('should prefer a successful response over a failed one', async () => {
    const bridge = createBridge();
    bridge.onCommand(() => Promise.reject(new Error('nope')));
    bridge.onCommand((command) => Promise.resolve(okResponse(command.id)));

    postFromExtension({ type: 'command', data: pingCommand('cmd-7') });
    await vi.waitFor(() => {
      expect(windowMessages).toHaveLength(1);
    });

    expect(windowMessages[0]?.response).toEqual(okResponse('cmd-7'));
  });
});

describe('FirstTxDevToolsBridge - lifecycle', () => {
  it('should report connection state based on the channel', () => {
    const bridge = createBridge();

    expect(bridge.isConnected()).toBe(true);

    bridge.destroy();

    expect(bridge.isConnected()).toBe(false);
    expect(channel().closed).toBe(true);
  });

  it('should clear buffered events on destroy', () => {
    const bridge = createBridge({ normalBatchInterval: 10_000 });

    bridge.emit(readyEvent('n1', EventPriority.NORMAL));
    bridge.destroy();

    expect(bridge.getBufferedEvents()).toEqual([]);
  });

  it('should be idempotent', () => {
    const bridge = createBridge();

    bridge.destroy();

    expect(() => {
      bridge.destroy();
    }).not.toThrow();
  });

  it('should ignore channel messages of unknown type', () => {
    createBridge();

    channel().receive({ type: 'whatever' });
    channel().receive(null);

    expect(windowMessages).toEqual([]);
  });
});

describe('getDevToolsBridge / destroyDevToolsBridge', () => {
  it('should return the same instance until it is destroyed', () => {
    const first = getDevToolsBridge({ persistHighPriority: false });
    const second = getDevToolsBridge({ persistHighPriority: false });

    expect(second).toBe(first);

    destroyDevToolsBridge();

    const third = getDevToolsBridge({ persistHighPriority: false });
    expect(third).not.toBe(first);
    expect(first.isConnected()).toBe(false);
    expect(third.isConnected()).toBe(true);

    destroyDevToolsBridge();
  });

  it('should be safe to call destroyDevToolsBridge without an instance', () => {
    expect(() => {
      destroyDevToolsBridge();
    }).not.toThrow();
  });
});

describe('FirstTxDevToolsBridge - persistence', () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    bridges.forEach((bridge) => {
      bridge.destroy();
    });
    await deleteDatabase();
  });

  it('should persist HIGH priority events when persistence is enabled', async () => {
    const bridge = createBridge({ persistHighPriority: true });

    bridge.emit(errorEvent('persisted-1'));

    await vi.waitFor(async () => {
      expect(await readPersistedIds()).toEqual(['persisted-1']);
    });
  });

  it('should not persist NORMAL priority events', async () => {
    const bridge = createBridge({ persistHighPriority: true, normalBatchInterval: 10_000 });

    bridge.emit(errorEvent('persisted-2'));
    bridge.emit(readyEvent('normal-1', EventPriority.NORMAL));

    await vi.waitFor(async () => {
      expect(await readPersistedIds()).toEqual(['persisted-2']);
    });
  });

  it('should not touch IndexedDB when persistence is disabled', async () => {
    const bridge = createBridge({ persistHighPriority: false });

    bridge.emit(errorEvent('not-persisted'));
    await Promise.resolve();

    await expect(readPersistedIds()).resolves.toEqual([]);
  });
});
