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

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    const reason = signal.reason instanceof Error ? signal.reason : new Error('Aborted');
    return Promise.reject(reason);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      clearTimeout(timer);
      const reason = signal?.reason instanceof Error ? signal.reason : new Error('Aborted');
      cleanup();
      reject(reason);
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
