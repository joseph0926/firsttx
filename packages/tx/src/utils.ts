/**
 * Checks if ViewTransition API is available
 * @returns true if document exists and supports ViewTransition
 */
export function supportsViewTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof document.startViewTransition === 'function'
  );
}
