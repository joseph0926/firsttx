import { useSyncExternalStore, useState, useEffect, useCallback } from 'react';
import type { ModelHistory, SyncOptions, SyncedModelResult, Fetcher } from './types';
import type { Model } from './model';

export function useModel<T>(model: Model<T>) {
  const state = useSyncExternalStore(
    model.subscribe,
    model.getCachedSnapshot,
    model.getCachedSnapshot,
  );

  const error = useSyncExternalStore(model.subscribe, model.getCachedError, model.getCachedError);

  const [history, setHistory] = useState<ModelHistory>({
    updatedAt: 0,
    age: Infinity,
    isStale: true,
    isConflicted: false,
  });

  useEffect(() => {
    model
      .getHistory()
      .then(setHistory)
      .catch((error: unknown) => {
        console.error(`[FirstTx] Failed to load history for model "${model.name}":`, error);
      });
  }, [model]);

  useEffect(() => {
    const unsubscribe = model.subscribe(() => {
      model
        .getHistory()
        .then(setHistory)
        .catch(() => {});
    });
    return unsubscribe;
  }, [model]);

  const patch = async (mutator: (draft: T) => void) => {
    await model.patch(mutator);
  };

  return [state, patch, history, error] as const;
}

export function useSyncedModel<T>(
  model: Model<T>,
  fetcher: Fetcher<T>,
  options?: SyncOptions<T>,
): SyncedModelResult<T> {
  const [state, patch, history] = useModel(model);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const currentData = model.getCachedSnapshot();
      const data = await fetcher(currentData);

      if ('startViewTransition' in document) {
        await document.startViewTransition(() => model.replace(data)).finished;
      } else {
        await model.replace(data);
      }

      options?.onSuccess?.(data);
    } catch (e) {
      const error = e as Error;
      setSyncError(error);
      options?.onError?.(error);

      if (process.env.NODE_ENV !== 'production') {
        console.error(`[FirstTx] Sync failed for model "${model.name}":`, error);
      }

      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [model, fetcher, options]);

  useEffect(() => {
    if (options?.autoSync && history.updatedAt > 0 && history.isStale && !isSyncing) {
      sync().catch(() => {});
    }
  }, [options?.autoSync, history.isStale, history.updatedAt, isSyncing]);

  return {
    data: state,
    patch,
    sync,
    isSyncing,
    error: syncError,
    history,
  };
}
