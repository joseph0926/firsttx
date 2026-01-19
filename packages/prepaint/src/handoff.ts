declare const __FIRSTTX_DEV__: boolean;

/**
 * The strategy used for React rendering based on prepaint availability.
 *
 * - `'has-prepaint'`: A prepaint snapshot was restored; hydration should be attempted.
 * - `'cold-start'`: No snapshot available; standard client-side rendering is used.
 */
export type HandoffStrategy = 'has-prepaint' | 'cold-start';

/**
 * Detects whether a prepaint snapshot was restored and determines the
 * appropriate rendering strategy.
 *
 * This function checks for the presence of the `data-prepaint` attribute
 * on the `<html>` element, which is set by the boot script when a snapshot
 * is successfully restored.
 *
 * @returns The handoff strategy to use for React rendering
 *
 * @example
 * ```typescript
 * import { handoff } from '@firsttx/prepaint';
 *
 * const strategy = handoff();
 * if (strategy === 'has-prepaint') {
 *   // Attempt hydration
 *   hydrateRoot(container, <App />);
 * } else {
 *   // Standard client render
 *   createRoot(container).render(<App />);
 * }
 * ```
 */
export function handoff(): HandoffStrategy {
  const hasPrepaint = document.documentElement.hasAttribute('data-prepaint');
  if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__ && hasPrepaint) {
    const timestamp = document.documentElement.getAttribute('data-prepaint-timestamp');
    const age = timestamp ? Date.now() - parseInt(timestamp, 10) : 0;
    console.log(`[FirstTx] Prepaint detected (age: ${age}ms)`);
  }
  return hasPrepaint ? 'has-prepaint' : 'cold-start';
}
