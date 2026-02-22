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
  });

  afterEach(() => {
    cleanupRoots();
    vi.restoreAllMocks();
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
      window.dispatchEvent(new Event('beforeunload'));
    });

    await waitFor(() => {
      expect(firstOnCapture).toHaveBeenCalledTimes(0);
      expect(secondOnCapture).toHaveBeenCalledTimes(1);
    });
  });

  it('replaces root-guard listeners across repeated createFirstTxRoot calls', async () => {
    const { createFirstTxRoot } = await import('../src/helpers');
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

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
    const removedPopstate = removeSpy.mock.calls.filter((call) => call[0] === 'popstate').length;
    const removedPageshow = removeSpy.mock.calls.filter((call) => call[0] === 'pageshow').length;

    expect(addedPopstate).toBe(3);
    expect(addedPageshow).toBe(3);
    expect(removedPopstate).toBe(2);
    expect(removedPageshow).toBe(2);
  });

  it('applies second setupCapture options on repeated setup', async () => {
    const { setupCapture } = await import('../src/capture');

    const root = setupRoot();
    root.innerHTML = '<div>Capture Target</div>';

    const firstOnCapture = vi.fn();
    const secondOnCapture = vi.fn();

    const cleanup = setupCapture({ routes: ['/allowed'], onCapture: firstOnCapture });
    setupCapture({ routes: ['/blocked'], onCapture: secondOnCapture });

    act(() => {
      window.history.pushState(null, '', '/blocked');
      window.dispatchEvent(new Event('beforeunload'));
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

    const snapshot = await captureSnapshot();

    expect(snapshot).not.toBeNull();
    expect(snapshot?.body).toContain('app-a');
    expect(snapshot?.body).not.toContain('app-b');
  });
});
