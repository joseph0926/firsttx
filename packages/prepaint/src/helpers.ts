import { hydrateRoot, createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { handoff, type HandoffStrategy } from './handoff';
import { setupCapture } from './capture';
import type { Snapshot } from './types';

export interface CreateFirstTxRootOptions {
  transition?: boolean;
  onCapture?: (snapshot: Snapshot) => void;
  onHandoff?: (strategy: HandoffStrategy) => void;
}

/**
 * createFirstTxRoot
 * @description Create and mount React root with FirstTx prepaint support
 *
 * @example
 * ```tsx
 * import { createFirstTxRoot } from '@firsttx/prepaint';
 *
 * createFirstTxRoot(
 *   document.getElementById('root')!,
 *   <App />
 * );
 * ```
 */
export function createFirstTxRoot(
  container: Element | DocumentFragment,
  element: ReactElement,
  options: CreateFirstTxRootOptions = {},
): void {
  const { transition = true, onCapture, onHandoff } = options;

  if (container instanceof DocumentFragment) {
    throw new Error(
      '[FirstTx] DocumentFragment is not supported for hydration. Use an Element instead.',
    );
  }

  setupCapture({ onCapture });

  const strategy = handoff();

  onHandoff?.(strategy);

  if (strategy === 'has-prepaint') {
    if (transition && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        hydrateRoot(container, element);
      });
    } else {
      hydrateRoot(container, element);
    }
  } else {
    createRoot(container).render(element);
  }
}
