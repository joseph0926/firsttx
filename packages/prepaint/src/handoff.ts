export interface HandoffOptions {
  /** callback to indicate that "handoff" has been completed */
  onReady?: (shouldHydrate: boolean) => void;
}

/**
 * Check if prepaint snapshot exists and determine hydration strategy
 *
 * @returns true if should hydrate, false if cold-start
 *
 * @example
 * ```ts
 * // Direct usage
 * const shouldHydrate = handoff();
 * const root = document.getElementById('root')!;
 *
 * if (shouldHydrate) {
 *   hydrateRoot(root, <App />);
 * } else {
 *   createRoot(root).render(<App />);
 * }
 *
 * // With callback
 * handoff({
 *   onReady: (shouldHydrate) => {
 *     const root = document.getElementById('root')!;
 *     if (shouldHydrate) {
 *       hydrateRoot(root, <App />);
 *     } else {
 *       createRoot(root).render(<App />);
 *     }
 *   }
 * });
 * ```
 */
export function handoff(options?: HandoffOptions): boolean {
  const hasPrepaint = document.documentElement.hasAttribute('data-prepaint');

  if (hasPrepaint && process.env.NODE_ENV === 'development') {
    const timestamp = document.documentElement.getAttribute('data-prepaint-timestamp');
    const age = timestamp ? Date.now() - parseInt(timestamp, 10) : 0;
    console.log(`[FirstTx] Prepaint detected (age: ${age}ms)`);
  }

  options?.onReady?.(hasPrepaint);
  return hasPrepaint;
}
