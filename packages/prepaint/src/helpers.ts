import { hydrateRoot, createRoot, type Root } from 'react-dom/client';
import type { ReactElement } from 'react';
import { handoff, type HandoffStrategy } from './handoff';
import { setupCapture } from './capture';
import type { Snapshot } from './types';
import { removeOverlay } from './overlay';
import { HydrationError } from './errors';
import { emitDevToolsEvent } from './devtools';
import { supportsViewTransition } from './utils';

export interface CreateFirstTxRootOptions {
  transition?: boolean;
  onCapture?: (snapshot: Snapshot) => void;
  onHandoff?: (strategy: HandoffStrategy) => void;
  onHydrationError?: (error: HydrationError) => void;
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

function inferMismatchType(error: Error): HydrationError['mismatchType'] {
  const msg = error.message.toLowerCase();
  if (msg.includes('attribute')) return 'attribute';
  if (msg.includes('structure') || msg.includes('children')) return 'structure';
  return 'content';
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

  emitDevToolsEvent('handoff', {
    strategy,
    canHydrate: strategy === 'has-prepaint' && canHydrate(container),
  });

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
        onRecoverableError: (reactError) => {
          const hydrationError = new HydrationError(
            'Hydration mismatch detected',
            inferMismatchType(reactError as Error),
            reactError as Error,
          );

          emitDevToolsEvent('hydration.error', {
            error: hydrationError.message,
            mismatchType: hydrationError.mismatchType,
            recovered: true,
            route: window.location.pathname,
          });

          onHydrationError?.(hydrationError);

          console.warn(hydrationError.getDebugInfo());

          if (bailed) return;
          bailed = true;
          if (supportsViewTransition() && transition) {
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
    if (supportsViewTransition() && transition) {
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
