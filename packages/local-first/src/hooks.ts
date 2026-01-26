import { useSyncExternalStore, useState, useEffect, useCallback, useRef } from 'react';
import type { SyncOptions, SyncedModelResult, Fetcher } from './types';
import type { Model } from './model';
import { emitModelEvent } from './devtools';
import { supportsViewTransition } from './utils';

/**
 * React hook for subscribing to model changes
 */
export function useModel<T>(model: Model<T>) {
  const snapshot = useSyncExternalStore(
    model.subscribe,
    model.getCombinedSnapshot,
    model.getCombinedSnapshot,
  );

  const patch = useCallback(
    async (mutator: (draft: T) => void) => {
      await model.patch(mutator);
    },
    [model],
  );

  return {
    data: snapshot.data,
    status: snapshot.status,
    error: snapshot.error,
    history: snapshot.history,
    patch,
  };
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
  const { data, status, patch, history, error } = useModel(model);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const syncInProgressRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);
  const syncTriggerRef = useRef<'mount' | 'manual' | 'stale'>('manual');
  const didAutoSyncRef = useRef<boolean>(false);

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

    const startTime = performance.now();
    const currentHistory = await model.getHistory();

    emitModelEvent('sync.start', {
      modelName: model.name,
      trigger: syncTriggerRef.current,
      currentAge: currentHistory.age,
    });

    try {
      const currentData = model.getCachedSnapshot();
      const data = await fetcherRef.current(currentData);

      if (supportsViewTransition()) {
        await document.startViewTransition(() => model.replace(data)).finished;
      } else {
        await model.replace(data);
      }

      const duration = performance.now() - startTime;
      const dataSize = JSON.stringify(data).length;
      const hadChanges = JSON.stringify(currentData) !== JSON.stringify(data);

      emitModelEvent('sync.success', {
        modelName: model.name,
        dataSize,
        duration,
        hadChanges,
      });

      optionsRef.current?.onSuccess?.(data);
    } catch (e) {
      const error = e as Error;
      setSyncError(error);

      const duration = performance.now() - startTime;

      emitModelEvent('sync.error', {
        modelName: model.name,
        error: error.message,
        duration,
        willRetry: false,
      });

      optionsRef.current?.onError?.(error);

      if (process.env.NODE_ENV !== 'production') {
        console.error(`[FirstTx] Sync failed for model "${model.name}":`, error);
      }

      throw error;
    } finally {
      syncInProgressRef.current = false;
      syncTriggerRef.current = 'manual';
      setIsSyncing(false);
    }
  }, [model]);

  useEffect(() => {
    didAutoSyncRef.current = false;
    syncTriggerRef.current = 'manual';
  }, [model]);

  useEffect(() => {
    if (didAutoSyncRef.current) return;
    const mode = optionsRef.current?.syncOnMount ?? 'always';
    if (mode === 'never') {
      didAutoSyncRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const h = await model.getHistory();
        const shouldSync = mode === 'always' || (mode === 'stale' && h.isStale);
        if (!cancelled && shouldSync) {
          didAutoSyncRef.current = true;
          if (mode === 'always') {
            syncTriggerRef.current = 'mount';
          } else if (h.isStale) {
            syncTriggerRef.current = 'stale';
          }
          await sync();
        } else {
          didAutoSyncRef.current = true;
        }
      } catch {
        didAutoSyncRef.current = true;
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [model, sync]);

  return {
    data,
    status,
    patch,
    sync,
    isSyncing,
    error: syncError || error,
    history,
  };
}
