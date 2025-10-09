import { hydrateRoot, createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import { handoff } from './handoff';
import { setupCapture } from './capture';

export interface CreateFirstTxRootOptions {
  transition?: boolean;
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
  const { transition = true } = options;

  if (container instanceof DocumentFragment) {
    throw new Error(
      '[FirstTx] DocumentFragment is not supported for hydration. Use an Element instead.',
    );
  }

  setupCapture();

  const strategy = handoff();

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
