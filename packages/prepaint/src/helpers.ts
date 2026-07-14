import { createElement, useLayoutEffect, useRef, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { handoff, type HandoffStrategy } from './handoff';
import { setupCapture } from './capture';
import type { Snapshot } from './types';
import { removeOverlay } from './overlay';
import type { HydrationError } from './errors';
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
  /**
   * @deprecated Cached client DOM is no longer hydrated, so this callback is never invoked.
   */
  onHydrationError?: (error: HydrationError) => void;
}

interface RootLifecycle {
  root: Root | null;
}

interface FirstCommitBoundaryProps {
  children: ReactElement;
  onCommit: () => void;
}

const ROOT_LIFECYCLES = new Map<Element, RootLifecycle>();

function FirstCommitBoundary({ children, onCommit }: FirstCommitBoundaryProps): ReactElement {
  const committed = useRef(false);

  useLayoutEffect(() => {
    if (committed.current) return;
    committed.current = true;
    onCommit();
  }, [onCommit]);

  return children;
}

function getOrCreateRootLifecycle(container: Element): RootLifecycle {
  const existing = ROOT_LIFECYCLES.get(container);
  if (existing) return existing;
  const created: RootLifecycle = { root: null };
  ROOT_LIFECYCLES.set(container, created);
  return created;
}

function cleanupRootLifecycle(container: Element): void {
  const lifecycle = ROOT_LIFECYCLES.get(container);
  if (!lifecycle) return;
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

function cleanupPrepaintMarks(): void {
  document.documentElement.removeAttribute('data-prepaint');
  document.documentElement.removeAttribute('data-prepaint-timestamp');
  document.documentElement.removeAttribute('data-prepaint-overlay');
  document
    .querySelectorAll('style[data-firsttx-prepaint]')
    .forEach((node) => node.parentElement?.removeChild(node));
  removeOverlay();
}

/**
 * Creates a clean React root with prepaint integration.
 *
 * A restored snapshot remains outside the React container as a non-interactive
 * overlay. React always mounts into an empty container with `createRoot`, and
 * the overlay is removed only after React's first commit.
 *
 * @param container - The DOM element to render into (must be an Element, not DocumentFragment)
 * @param element - The React element to render
 * @param options - Configuration options
 *
 * @throws {Error} If container is a DocumentFragment (not supported)
 */
export function createFirstTxRoot(
  container: Element | DocumentFragment,
  element: ReactElement,
  options: CreateFirstTxRootOptions = {},
): void {
  'use no memo';
  const { transition = true, onCapture, onHandoff } = options;
  if (container instanceof DocumentFragment) {
    throw new Error('[FirstTx] DocumentFragment is not supported. Use an Element instead.');
  }

  cleanupDetachedLifecycles();
  if (ROOT_LIFECYCLES.has(container)) {
    cleanupRootLifecycle(container);
  }

  container.replaceChildren();
  const lifecycle = getOrCreateRootLifecycle(container);

  setupCapture({ onCapture });
  const strategy = handoff();

  emitDevToolsEvent('handoff', {
    strategy,
    canHydrate: false,
  });

  onHandoff?.(strategy);

  const finishHandoff = () => {
    if (supportsViewTransition() && transition) {
      document.startViewTransition(() => {
        cleanupPrepaintMarks();
      });
      return;
    }
    cleanupPrepaintMarks();
  };

  const content =
    strategy === 'has-prepaint'
      ? createElement(FirstCommitBoundary, { onCommit: finishHandoff, children: element })
      : element;
  const root = createRoot(container);
  lifecycle.root = root;
  root.render(content);
}
