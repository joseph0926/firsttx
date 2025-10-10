import { useSyncExternalStore, useState, useEffect, useCallback, useRef } from 'react';
import type { SyncOptions, SyncedModelResult, Fetcher } from './types';
import type { Model } from './model';

/**
 * React hook for subscribing to model changes
 */
export function useModel<T>(model: Model<T>) {
  const snapshot = useSyncExternalStore(
    model.subscribe,
    model.getCombinedSnapshot,
    model.getCombinedSnapshot,
  );

  const patch = async (mutator: (draft: T) => void) => {
    await model.patch(mutator);
  };

  return [snapshot.data, patch, snapshot.history, snapshot.error] as const;
}

/**
 * React hook with built-in server synchronization
 * Features: autoSync, race condition prevention, stable fetcher reference
 */
export function useSyncedModel<T>(
  model: Model<T>,
  fetcher: Fetcher<T>,
  options?: SyncOptions<T>,
): SyncedModelResult<T> {
  const [state, patch, history, error] = useModel(model);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const syncInProgressRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);

  useEffect(() => {
    fetcherRef.current = fetcher;
    optionsRef.current = options;
  });

  /**
   * Syncs with server (prevents concurrent calls)
   */
  const sync = useCallback(async () => {
    if (syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const currentData = model.getCachedSnapshot();
      const data = await fetcherRef.current(currentData);

      if ('startViewTransition' in document) {
        await document.startViewTransition(() => model.replace(data)).finished;
      } else {
        await model.replace(data);
      }

      optionsRef.current?.onSuccess?.(data);
    } catch (e) {
      const error = e as Error;
      setSyncError(error);
      optionsRef.current?.onError?.(error);

      if (process.env.NODE_ENV !== 'production') {
        console.error(`[FirstTx] Sync failed for model "${model.name}":`, error);
      }

      throw error;
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [model]);

  /**
   * AutoSync: triggers when data becomes stale
   */
  useEffect(() => {
    if (optionsRef.current?.autoSync && history.updatedAt > 0 && history.isStale && !isSyncing) {
      sync().catch(() => {});
    }
  }, [history.isStale, history.updatedAt, isSyncing, sync]);

  return {
    data: state,
    patch,
    sync,
    isSyncing,
    error: syncError || error,
    history,
  };
}
