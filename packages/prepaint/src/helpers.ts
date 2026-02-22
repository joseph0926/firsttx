import { hydrateRoot, createRoot, type Root } from 'react-dom/client';
import type { ReactElement } from 'react';
import { handoff, type HandoffStrategy } from './handoff';
import { setupCapture } from './capture';
import type { Snapshot } from './types';
import { removeOverlay } from './overlay';
import { HydrationError } from './errors';
import { emitDevToolsEvent } from './devtools';
import { supportsViewTransition } from './utils';

/**
 * Configuration options for `createFirstTxRoot`.
 */
export interface CreateFirstTxRootOptions {
  /**
   * Whether to use ViewTransition API for smooth visual transitions.
   * @default true
   */
  transition?: boolean;
  /** Callback invoked when a snapshot is captured (on page hide/unload). */
  onCapture?: (snapshot: Snapshot) => void;
  /** Callback invoked after determining the handoff strategy. */
  onHandoff?: (strategy: HandoffStrategy) => void;
  /** Callback invoked when a hydration mismatch is detected and recovered. */
  onHydrationError?: (error: HydrationError) => void;
}

interface RootLifecycle {
  root: Root | null;
  guardCleanup: (() => void) | null;
}

const ROOT_LIFECYCLES = new Map<Element, RootLifecycle>();

function getOrCreateRootLifecycle(container: Element): RootLifecycle {
  const existing = ROOT_LIFECYCLES.get(container);
  if (existing) return existing;
  const created: RootLifecycle = { root: null, guardCleanup: null };
  ROOT_LIFECYCLES.set(container, created);
  return created;
}

function cleanupRootLifecycle(container: Element): void {
  const lifecycle = ROOT_LIFECYCLES.get(container);
  if (!lifecycle) return;
  lifecycle.guardCleanup?.();
  lifecycle.guardCleanup = null;
  try {
    lifecycle.root?.unmount?.();
  } catch {}
  lifecycle.root = null;
}

function cleanupDetachedLifecycles(): void {
  for (const [trackedContainer] of ROOT_LIFECYCLES) {
    if (trackedContainer.isConnected) continue;
    cleanupRootLifecycle(trackedContainer);
    ROOT_LIFECYCLES.delete(trackedContainer);
  }
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
      try {
        reset();
      } finally {
        resetting = false;
      }
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

function installManagedRootGuard(
  container: Element,
  lifecycle: RootLifecycle,
  reset: () => void,
): void {
  lifecycle.guardCleanup?.();
  lifecycle.guardCleanup = installRootGuard(container, () => lifecycle.root, reset);
}

function inferMismatchType(error: Error): HydrationError['mismatchType'] {
  const msg = error.message.toLowerCase();
  if (msg.includes('attribute')) return 'attribute';
  if (msg.includes('structure') || msg.includes('children')) return 'structure';
  return 'content';
}

/**
 * Creates a React root with prepaint integration, handling hydration,
 * snapshot capture, and error recovery automatically.
 *
 * This is the main entry point for integrating prepaint with React apps.
 * It replaces `createRoot` or `hydrateRoot` with intelligent behavior:
 *
 * - **has-prepaint strategy**: If a prepaint snapshot was restored, attempts
 *   hydration. On mismatch, gracefully falls back to client render.
 * - **cold-start strategy**: No snapshot available, performs standard client render.
 *
 * @description
 * The function:
 * 1. Sets up automatic snapshot capture on page hide/unload
 * 2. Detects if a prepaint snapshot is present (`data-prepaint` attribute)
 * 3. Attempts hydration if possible, with automatic error recovery
 * 4. Installs a root guard to handle edge cases (multiple children, navigation)
 * 5. Cleans up prepaint markers after successful render
 *
 * @param container - The DOM element to render into (must be an Element, not DocumentFragment)
 * @param element - The React element to render
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * // In your app's entry point (e.g., main.tsx)
 * import { createFirstTxRoot } from '@firsttx/prepaint';
 *
 * createFirstTxRoot(
 *   document.getElementById('root')!,
 *   <App />,
 *   {
 *     transition: true,
 *     onHandoff: (strategy) => {
 *       console.log('Handoff strategy:', strategy);
 *     },
 *     onHydrationError: (error) => {
 *       console.warn('Hydration error:', error.mismatchType);
 *     },
 *   }
 * );
 * ```
 *
 * @throws {Error} If container is a DocumentFragment (not supported)
 */
export function createFirstTxRoot(
  container: Element | DocumentFragment,
  element: ReactElement,
  options: CreateFirstTxRootOptions = {},
): void {
  'use no memo';
  const { transition = true, onCapture, onHandoff, onHydrationError } = options;
  if (container instanceof DocumentFragment) {
    throw new Error(
      '[FirstTx] DocumentFragment is not supported for hydration. Use an Element instead.',
    );
  }

  cleanupDetachedLifecycles();
  if (ROOT_LIFECYCLES.has(container)) {
    cleanupRootLifecycle(container);
    container.innerHTML = '';
  }

  const lifecycle = getOrCreateRootLifecycle(container);

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
    const runClientReset = () => {
      try {
        lifecycle.root?.unmount?.();
      } catch {}
      container.innerHTML = '';
      const r = createRoot(container);
      r.render(element);
      lifecycle.root = r;
      cleanupPrepaintMarks();
      installManagedRootGuard(container, lifecycle, () => {
        const r2 = createRoot(container);
        r2.render(element);
        lifecycle.root = r2;
        cleanupPrepaintMarks();
      });
    };
    const runHydrate = () => {
      lifecycle.root = hydrateRoot(container, element, {
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
        installManagedRootGuard(container, lifecycle, () => {
          const r = createRoot(container);
          r.render(element);
          lifecycle.root = r;
          cleanupPrepaintMarks();
        });
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
    lifecycle.root = r;
    cleanupPrepaintMarks();
    installManagedRootGuard(container, lifecycle, () => {
      const r2 = createRoot(container);
      r2.render(element);
      lifecycle.root = r2;
      cleanupPrepaintMarks();
    });
  }
}
