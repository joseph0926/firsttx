import { act, Fragment } from 'react';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot } from '../src/boot';
import { createFirstTxRoot } from '../src/helpers';
import { removeOverlay } from '../src/overlay';
import type { Snapshot } from '../src/types';

function setupRoot(inner = ''): HTMLElement {
  document.getElementById('root')?.remove();
  const root = document.createElement('div');
  root.id = 'root';
  root.innerHTML = inner;
  document.body.appendChild(root);
  return root;
}

async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('firsttx-prepaint', 1);
    request.onerror = () => reject(request.error ?? new Error('Failed to open snapshot database'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'route' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put(snapshot);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save snapshot'));
    };
  });
}

describe('visual snapshot handoff', () => {
  beforeEach(() => {
    document.getElementById('root')?.remove();
    removeOverlay();
    document.documentElement.removeAttribute('data-prepaint');
    document.documentElement.removeAttribute('data-prepaint-timestamp');
    document.documentElement.removeAttribute('data-prepaint-overlay');
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    document.getElementById('root')?.remove();
    removeOverlay();
    const request = indexedDB.deleteDatabase('firsttx-prepaint');
    await new Promise<void>((resolve) => {
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('mounts React with createRoot instead of hydrating restored client DOM', async () => {
    const root = setupRoot('<div id="legacy-root">Legacy root content</div>');
    const onHydrationError = vi.fn();
    await saveSnapshot({
      route: '/',
      timestamp: Date.now(),
      body: '<div id="snapshot-content">Snapshot content</div>',
      styles: [],
    });

    await boot();

    expect(root.querySelector('#legacy-root')).toBeTruthy();
    expect(document.getElementById('__firsttx_prepaint__')).toBeTruthy();

    act(() => {
      createFirstTxRoot(root, <div id="react-content">React content</div>, {
        transition: false,
        onHydrationError,
      });
    });

    await waitFor(() => {
      expect(root.querySelector('#legacy-root')).toBeNull();
      expect(root.querySelector('#react-content')?.textContent).toBe('React content');
      expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
    });
    expect(onHydrationError).not.toHaveBeenCalled();
  });

  it('keeps the overlay until the first React commit', async () => {
    const root = setupRoot();
    let ready = false;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = () => {
        ready = true;
        resolve();
      };
    });
    const App = () => {
      if (!ready) throw pending as unknown as Error;
      return <div>Committed content</div>;
    };
    await saveSnapshot({
      route: '/',
      timestamp: Date.now(),
      body: '<div>Snapshot content</div>',
      styles: [],
    });
    await boot();

    act(() => {
      createFirstTxRoot(root, <App />, { transition: false });
    });

    expect(document.getElementById('__firsttx_prepaint__')).toBeTruthy();
    expect(document.documentElement.hasAttribute('data-prepaint')).toBe(true);

    await act(async () => {
      release();
      await pending;
    });

    await waitFor(() => {
      expect(root.textContent).toContain('Committed content');
      expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
      expect(document.documentElement.hasAttribute('data-prepaint')).toBe(false);
    });
  });

  it('accepts fragments with multiple root children without a root guard reset', async () => {
    const root = setupRoot();

    act(() => {
      createFirstTxRoot(
        root,
        <Fragment>
          <div>First child</div>
          <div>Second child</div>
        </Fragment>,
        { transition: false },
      );
    });

    await waitFor(() => {
      expect(root.children).toHaveLength(2);
    });

    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new PageTransitionEvent('pageshow'));

    expect(root.children).toHaveLength(2);
    expect(root.textContent).toContain('First child');
    expect(root.textContent).toContain('Second child');
  });

  it('starts ViewTransition only after React content commits', async () => {
    const root = setupRoot();
    const originalStartViewTransition = Object.getOwnPropertyDescriptor(
      document,
      'startViewTransition',
    );
    const transition = {
      finished: Promise.resolve(),
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
    };
    const startViewTransition = vi.fn((callback: () => void) => {
      expect(root.textContent).toContain('React content');
      callback();
      return transition;
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });
    await saveSnapshot({
      route: '/',
      timestamp: Date.now(),
      body: '<div>Snapshot content</div>',
      styles: [],
    });
    await boot();

    act(() => {
      createFirstTxRoot(root, <div>React content</div>, { transition: true });
    });

    await waitFor(() => {
      expect(startViewTransition).toHaveBeenCalledTimes(1);
      expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
    });

    if (originalStartViewTransition) {
      Object.defineProperty(document, 'startViewTransition', originalStartViewTransition);
    } else {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
  });
});
