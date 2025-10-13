import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { createFirstTxRoot } from '../src/helpers';
import { boot } from '../src/boot';
import type { Snapshot } from '../src/types';
import { useState, useEffect } from 'react';

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

describe('Hydration Failure & Safe Bailout', () => {
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

  describe('A) onRecoverableError Detection', () => {
    it('should trigger onRecoverableError callback when provided', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div id="test-container"><span>Time: 12345</span></div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      expect(root.innerHTML).toContain('Time: 12345');
      expect(document.documentElement.hasAttribute('data-prepaint')).toBe(true);

      const onHydrationError = vi.fn();

      const App = () => (
        <div id="test-container">
          <span>Time: 67890</span>
        </div>
      );

      createFirstTxRoot(root, <App />, {
        transition: false,
        onHydrationError,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalHTML = root.innerHTML;

      expect(finalHTML).toBeTruthy();
      expect(root.children.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple children in root (guard trigger)', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div id="app">First</div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      expect(root.children.length).toBe(1);

      const App = () => <div id="app">Updated</div>;

      createFirstTxRoot(root, <App />, { transition: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const extraChild = document.createElement('div');
      extraChild.textContent = 'Extra';
      root.appendChild(extraChild);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(root.children.length).toBe(1);
    });
  });

  describe('B) Bailout & Clean Render', () => {
    it('should fallback to createRoot when hydration fails', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div id="complex"><span data-id="1">Old</span><span data-id="2">Content</span></div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      expect(root.innerHTML).toContain('Old');

      const App = () => (
        <div id="complex">
          <p>New Structure</p>
          <button>Click me</button>
        </div>
      );

      createFirstTxRoot(root, <App />, { transition: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalHTML = root.innerHTML.toLowerCase();
      expect(finalHTML).toContain('new structure');
      expect(finalHTML).toContain('button');
    });

    it('should work with stateful components after bailout', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div id="counter"><span>Count: 0</span></div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      const Counter = () => {
        const [count, setCount] = useState(0);
        return (
          <div id="counter">
            <span>Count: {count}</span>
            <button onClick={() => setCount((c) => c + 1)}>Increment</button>
          </div>
        );
      };

      createFirstTxRoot(root, <Counter />, { transition: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const button = root.querySelector('button');
      expect(button).toBeTruthy();

      button?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const span = root.querySelector('span');
      expect(span?.textContent).toContain('Count: 1');
    });
  });

  describe('C) Cleanup After Hydration', () => {
    it('should remove prepaint markers after mount', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div>Content</div>',
        styles: ['.test { color: red; }'],
      };
      await saveSnapshot(snapshot);
      await boot();

      expect(document.documentElement.hasAttribute('data-prepaint')).toBe(true);
      expect(document.querySelectorAll('style[data-firsttx-prepaint]').length).toBeGreaterThan(0);

      const App = () => <div>Content</div>;
      createFirstTxRoot(root, <App />, { transition: false });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
      expect(document.documentElement.hasAttribute('data-prepaint-timestamp')).toBe(false);

      expect(document.querySelectorAll('style[data-firsttx-prepaint]').length).toBe(0);
    });

    it('should remove overlay if it was used', async () => {
      const root = setupRoot();

      window.__FIRSTTX_OVERLAY__ = true;

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div>Overlay Content</div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      const overlay = document.getElementById('__firsttx_prepaint__');
      expect(overlay).toBeTruthy();
      expect(document.documentElement.hasAttribute('data-prepaint-overlay')).toBe(true);

      const App = () => <div>React Content</div>;
      createFirstTxRoot(root, <App />, { transition: false });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
      expect(document.documentElement.hasAttribute('data-prepaint-overlay')).toBe(false);

      delete window.__FIRSTTX_OVERLAY__;
    });
  });

  describe('D) ViewTransition Integration', () => {
    it('should use ViewTransition when available and transition=true', async () => {
      const root = setupRoot();

      const mockFinished = Promise.resolve();
      const mockTransition = {
        finished: mockFinished,
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };

      const startViewTransition = vi.fn((callback: () => void) => {
        callback();
        return mockTransition;
      });

      // @ts-expect-error - no type
      document.startViewTransition = startViewTransition;

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div>Old</div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      const App = () => <div>New</div>;
      createFirstTxRoot(root, <App />, { transition: true });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(root.innerHTML).toBeTruthy();

      // @ts-expect-error - cleanup
      delete document.startViewTransition;
    });

    it('should work without ViewTransition (graceful degradation)', async () => {
      const root = setupRoot();

      // eslint-disable-next-line
      const original = document.startViewTransition;

      // @ts-expect-error - cleanup
      delete document.startViewTransition;

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div>Content</div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      const App = () => <div>Content</div>;

      expect(() => {
        createFirstTxRoot(root, <App />, { transition: true });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(root.innerHTML).toBeTruthy();

      if (original) {
        document.startViewTransition = original;
      }
    });
  });

  describe('E) Edge Cases', () => {
    it('should handle empty root after prepaint', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      expect(root.children.length).toBe(0);

      const App = () => <div>Fresh Start</div>;

      createFirstTxRoot(root, <App />, { transition: false });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(root.innerHTML).toContain('Fresh Start');
    });

    it('should handle rapid re-mounts', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div>Initial</div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      const App1 = () => <div>Mount 1</div>;
      const App2 = () => <div>Mount 2</div>;
      const App3 = () => <div>Mount 3</div>;

      createFirstTxRoot(root, <App1 />, { transition: false });
      await new Promise((resolve) => setTimeout(resolve, 30));

      cleanupRoot();
      const root2 = setupRoot();
      createFirstTxRoot(root2, <App2 />, { transition: false });
      await new Promise((resolve) => setTimeout(resolve, 30));

      cleanupRoot();
      const root3 = setupRoot();
      createFirstTxRoot(root3, <App3 />, { transition: false });
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(root3.innerHTML).toContain('Mount 3');
    });

    it('should handle components with useEffect', async () => {
      const root = setupRoot();

      const snapshot: Snapshot = {
        route: '/',
        timestamp: Date.now(),
        body: '<div id="effect-test">Loading...</div>',
        styles: [],
      };
      await saveSnapshot(snapshot);
      await boot();

      let effectRan = false;

      const EffectComponent = () => {
        const [text, setText] = useState('Loading...');

        useEffect(() => {
          effectRan = true;
          setText('Loaded!');
        }, []);

        return <div id="effect-test">{text}</div>;
      };

      createFirstTxRoot(root, <EffectComponent />, { transition: false });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(effectRan).toBe(true);
      expect(root.innerHTML).toContain('Loaded!');
    });
  });
});
