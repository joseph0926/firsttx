import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// BroadcastChannel polyfill for testing
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners = new Set<(event: MessageEvent) => void>();

  constructor(name: string) {
    this.name = name;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  postMessage(_message: unknown) {
    // Mock implementation - does nothing by default
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  close() {
    this.listeners.clear();
    this.onmessage = null;
  }

  // Test helper to simulate receiving a message
  _simulateMessage(data: unknown) {
    const event = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(event);
    }
    this.listeners.forEach((listener) => listener(event));
  }
}

globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;

// Mock Date.now for consistent timestamps in tests
vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

// Mock Math.random for consistent IDs in tests
vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
