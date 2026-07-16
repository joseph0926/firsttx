import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { act } from 'react';

function setupRoot(id = 'root'): HTMLElement {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const root = document.createElement('div');
  root.id = id;
  document.body.appendChild(root);
  return root;
}

function cleanupRoots(): void {
  document.querySelectorAll('#root').forEach((node) => node.remove());
}

describe('Re-initialization behavior', () => {
  beforeEach(() => {
    cleanupRoots();
    indexedDB.deleteDatabase('firsttx-prepaint');
    document.documentElement.removeAttribute('data-prepaint');
    document.documentElement.removeAttribute('data-prepaint-timestamp');
    document.documentElement.removeAttribute('data-prepaint-overlay');
    window.history.pushState(null, '', '/');
    vi.restoreAllMocks();
    vi.resetModules();
    (
      globalThis as typeof globalThis & {
        __FIRSTTX_PREPAINT_POLICY__?: unknown;
      }
    ).__FIRSTTX_PREPAINT_POLICY__ = { routes: ['/', '/allowed', '/blocked'] };
  });

  afterEach(() => {
    cleanupRoots();
    vi.restoreAllMocks();
    delete (
      globalThis as typeof globalThis & {
        __FIRSTTX_PREPAINT_POLICY__?: unknown;
      }
    ).__FIRSTTX_PREPAINT_POLICY__;
  });

  it('uses the latest onCapture callback after createFirstTxRoot re-init', async () => {
    const { createFirstTxRoot } = await import('../src/helpers');

    const root = setupRoot();
    const firstOnCapture = vi.fn();
    const secondOnCapture = vi.fn();

    act(() => {
      createFirstTxRoot(root, <div>Mount A</div>, { transition: false, onCapture: firstOnCapture });
    });

    act(() => {
      createFirstTxRoot(root, <div>Mount B</div>, {
        transition: false,
        onCapture: secondOnCapture,
      });
    });

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    await waitFor(() => {
      expect(firstOnCapture).toHaveBeenCalledTimes(0);
      expect(secondOnCapture).toHaveBeenCalledTimes(1);
    });
  });

  it('does not duplicate capture lifecycle listeners across repeated roots', async () => {
    const { createFirstTxRoot } = await import('../src/helpers');
    const addSpy = vi.spyOn(window, 'addEventListener');

    const root1 = setupRoot();
    act(() => {
      createFirstTxRoot(root1, <div>Mount 1</div>, { transition: false });
    });

    cleanupRoots();
    const root2 = setupRoot();
    act(() => {
      createFirstTxRoot(root2, <div>Mount 2</div>, { transition: false });
    });

    cleanupRoots();
    const root3 = setupRoot();
    act(() => {
      createFirstTxRoot(root3, <div>Mount 3</div>, { transition: false });
    });

    const addedPopstate = addSpy.mock.calls.filter((call) => call[0] === 'popstate').length;
    const addedPageshow = addSpy.mock.calls.filter((call) => call[0] === 'pageshow').length;

    expect(addedPopstate).toBe(0);
    expect(addedPageshow).toBe(1);
  });

  it('applies second setupCapture options on repeated setup', async () => {
    const { setupCapture } = await import('../src/capture');

    const root = setupRoot();
    root.innerHTML = '<div>Capture Target</div>';

    const firstOnCapture = vi.fn();
    const secondOnCapture = vi.fn();

    const cleanup = setupCapture({
      policy: { routes: ['/allowed'] },
      onCapture: firstOnCapture,
    });
    setupCapture({ policy: { routes: ['/blocked'] }, onCapture: secondOnCapture });

    act(() => {
      window.history.pushState(null, '', '/blocked');
      window.dispatchEvent(new Event('pagehide'));
    });

    await waitFor(() => {
      expect(firstOnCapture).toHaveBeenCalledTimes(0);
      expect(secondOnCapture).toHaveBeenCalledTimes(1);
    });

    cleanup();
  });

  it('captures only the first child under #root (multi-root limitation)', async () => {
    const { captureSnapshot } = await import('../src/capture');

    const root = setupRoot();
    root.innerHTML = `
      <div id="app-a">App A</div>
      <div id="app-b">App B</div>
    `;

    const snapshot = await captureSnapshot({ routes: ['/'] });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.body).toContain('app-a');
    expect(snapshot?.body).not.toContain('app-b');
  });
});
