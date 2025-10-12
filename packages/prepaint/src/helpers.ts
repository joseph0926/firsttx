import { hydrateRoot, createRoot, type Root } from 'react-dom/client';
import type { ReactElement } from 'react';
import { handoff, type HandoffStrategy } from './handoff';
import { setupCapture } from './capture';
import type { Snapshot } from './types';
import { removeOverlay } from './overlay';

export interface CreateFirstTxRootOptions {
  transition?: boolean;
  onCapture?: (snapshot: Snapshot) => void;
  onHandoff?: (strategy: HandoffStrategy) => void;
  onHydrationError?: (error: Error) => void;
}

function canHydrate(container: Element): boolean {
  const count = container.children.length;
  return count === 1;
}

function cleanupPrepaintMarks(): void {
  document.documentElement.removeAttribute('data-prepaint');
  document.documentElement.removeAttribute('data-prepaint-timestamp');
  document.documentElement.removeAttribute('data-prepaint-overlay');
  document
    .querySelectorAll('style[data-firsttx-prepaint]')
    .forEach((n) => n.parentElement?.removeChild(n));
  removeOverlay();
}

function installRootGuard(container: Element, getRoot: () => Root | null, reset: () => void) {
  let resetting = false;
  const check = () => {
    if (resetting) return;
    if (container.children.length !== 1) {
      resetting = true;
      try {
        getRoot()?.unmount?.();
      } catch {}
      container.innerHTML = '';
      reset();
      resetting = false;
    }
  };
  const mo = new MutationObserver(() => check());
  mo.observe(container, { childList: true, subtree: false });
  window.addEventListener('popstate', check);
  window.addEventListener('pageshow', check);
  return () => {
    mo.disconnect();
    window.removeEventListener('popstate', check);
    window.removeEventListener('pageshow', check);
  };
}

export function createFirstTxRoot(
  container: Element | DocumentFragment,
  element: ReactElement,
  options: CreateFirstTxRootOptions = {},
): void {
  const { transition = true, onCapture, onHandoff, onHydrationError } = options;
  if (container instanceof DocumentFragment) {
    throw new Error(
      '[FirstTx] DocumentFragment is not supported for hydration. Use an Element instead.',
    );
  }
  setupCapture({ onCapture });
  const strategy = handoff();
  onHandoff?.(strategy);
  const attemptHydration = strategy === 'has-prepaint' && canHydrate(container);
  if (attemptHydration) {
    let bailed = false;
    let root: Root | null = null;
    const runClientReset = () => {
      try {
        root?.unmount?.();
      } catch {}
      container.innerHTML = '';
      const r = createRoot(container);
      r.render(element);
      root = r;
      cleanupPrepaintMarks();
      installRootGuard(
        container,
        () => root,
        () => {
          const r2 = createRoot(container);
          r2.render(element);
          root = r2;
          cleanupPrepaintMarks();
        },
      );
    };
    const runHydrate = () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => {
          onHydrationError?.(error as Error);
          if (bailed) return;
          bailed = true;
          if (
            'startViewTransition' in document &&
            typeof document.startViewTransition === 'function' &&
            transition
          ) {
            document.startViewTransition(() => {
              runClientReset();
            });
          } else {
            runClientReset();
          }
        },
      });
      queueMicrotask(() => {
        cleanupPrepaintMarks();
        installRootGuard(
          container,
          () => root,
          () => {
            const r = createRoot(container);
            r.render(element);
            root = r;
            cleanupPrepaintMarks();
          },
        );
      });
    };
    if (
      'startViewTransition' in document &&
      typeof document.startViewTransition === 'function' &&
      transition
    ) {
      document.startViewTransition(runHydrate);
    } else {
      runHydrate();
    }
  } else {
    const r = createRoot(container);
    r.render(element);
    cleanupPrepaintMarks();
    installRootGuard(
      container,
      () => r,
      () => {
        const r2 = createRoot(container);
        r2.render(element);
        cleanupPrepaintMarks();
      },
    );
  }
}
