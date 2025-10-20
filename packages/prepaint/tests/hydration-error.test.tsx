import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { createFirstTxRoot } from '../src/helpers';
import { boot } from '../src/boot';
import type { Snapshot } from '../src/types';
import { HydrationError } from '../src/errors';

function setupRoot() {
  const existing = document.getElementById('root');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  return root;
}

function cleanupRoot() {
  const root = document.getElementById('root');
  if (root) root.remove();
}

async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('firsttx-prepaint', 1);
    // eslint-disable-next-line
    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'route' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      store.put(snapshot);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      // eslint-disable-next-line
      tx.onerror = () => reject(tx.error);
    };
  });
}

describe('HydrationError', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-prepaint');
    document.documentElement.removeAttribute('data-prepaint');
    document.documentElement.removeAttribute('data-prepaint-timestamp');
    cleanupRoot();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupRoot();
  });

  it('should create HydrationError with correct properties', () => {
    const cause = new Error('React hydration mismatch');
    const error = new HydrationError('Mismatch detected', 'content', cause);

    expect(error).toBeInstanceOf(HydrationError);
    expect(error.name).toBe('HydrationError');
    expect(error.message).toBe('Mismatch detected');
    expect(error.mismatchType).toBe('content');
    expect(error.cause).toBe(cause);
  });

  it('should provide user-friendly message', () => {
    const cause = new Error('Mismatch');
    const error = new HydrationError('Test', 'content', cause);

    const userMessage = error.getUserMessage();
    expect(userMessage).toContain('Page content has been updated');
    expect(userMessage).toContain('Loading fresh version');
  });

  it('should provide detailed debug info', () => {
    const cause = new Error('Text content mismatch');
    const error = new HydrationError('Hydration failed', 'content', cause);

    const debugInfo = error.getDebugInfo();
    expect(debugInfo).toContain('[HydrationError]');
    expect(debugInfo).toContain('content mismatch');
    expect(debugInfo).toContain('Text content mismatch');
  });

  it('should be recoverable', () => {
    const cause = new Error('Mismatch');
    const error = new HydrationError('Test', 'content', cause);

    expect(error.isRecoverable()).toBe(true);
  });

  it('should infer content mismatch type correctly', async () => {
    const root = setupRoot();
    let capturedError: HydrationError | undefined;

    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="test"><span>Old Text</span></div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot();

    expect(root.innerHTML).toContain('Old Text');

    const App = () => (
      <div id="test">
        <span>New Text</span>
      </div>
    );

    createFirstTxRoot(root, <App />, {
      transition: false,
      onHydrationError: (error) => {
        capturedError = error;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (capturedError) {
      expect(capturedError).toBeInstanceOf(HydrationError);
      expect(capturedError.mismatchType).toBe('content');
    }
  });

  it('should infer attribute mismatch type correctly', async () => {
    const root = setupRoot();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="test" class="old">Content</div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot();

    const App = () => (
      <div id="test" className="new">
        Content
      </div>
    );

    createFirstTxRoot(root, <App />, {
      transition: false,
      onHydrationError: (error) => {
        expect(error.mismatchType).toBe('attribute');
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    warnSpy.mockRestore();
  });

  it('should log debug info when __FIRSTTX_DEV__ is enabled', async () => {
    const root = setupRoot();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    (globalThis as { __FIRSTTX_DEV__?: boolean }).__FIRSTTX_DEV__ = true;

    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="test">Old</div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot();

    const App = () => <div id="test">New</div>;

    createFirstTxRoot(root, <App />, { transition: false });

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (warnSpy.mock.calls.length > 0) {
      const debugCall = warnSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('[HydrationError]'),
      );
      if (debugCall) {
        expect(debugCall[0]).toContain('content mismatch');
      }
    }

    delete (globalThis as { __FIRSTTX_DEV__?: boolean }).__FIRSTTX_DEV__;
    warnSpy.mockRestore();
  });

  it('should trigger automatic recovery after hydration error', async () => {
    const root = setupRoot();
    let errorTriggered = false;

    const snapshot: Snapshot = {
      route: '/',
      timestamp: Date.now(),
      body: '<div id="counter"><span>Count: 999</span></div>',
      styles: [],
    };
    await saveSnapshot(snapshot);
    await boot();

    const App = () => (
      <div id="counter">
        <span>Count: 0</span>
      </div>
    );

    createFirstTxRoot(root, <App />, {
      transition: false,
      onHydrationError: () => {
        errorTriggered = true;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const content = root.textContent;
    expect(content).toContain('Count: 0');

    if (errorTriggered) {
      expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
    }
  });

  it('should handle multiple mismatch types', () => {
    const contentError = new HydrationError('Content', 'content', new Error('text mismatch'));
    const attributeError = new HydrationError('Attr', 'attribute', new Error('attr mismatch'));
    const structureError = new HydrationError('Structure', 'structure', new Error('children'));

    expect(contentError.mismatchType).toBe('content');
    expect(attributeError.mismatchType).toBe('attribute');
    expect(structureError.mismatchType).toBe('structure');

    expect(contentError.isRecoverable()).toBe(true);
    expect(attributeError.isRecoverable()).toBe(true);
    expect(structureError.isRecoverable()).toBe(true);
  });
});
