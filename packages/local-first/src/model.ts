import type { z } from 'zod';
import type { ModelHistory, ModelOptions } from './types';
import { FirstTxError, StorageError } from './errors';
import { ModelBroadcaster } from './broadcast';
import { emitModelEvent } from './devtools';
import { CacheManager } from './cache-manager';
import type { CombinedSnapshot } from './cache-manager';
import { StorageManager } from './storage-manager';
import { SyncManager } from './sync-manager';
import type { SyncPromiseOptions } from './sync-manager';

export type { CacheState, CombinedSnapshot } from './cache-manager';
export type { SyncPromiseOptions } from './sync-manager';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export type Model<T> = {
  name: string;
  schema: z.ZodType<T>;
  ttl: number;
  merge: (current: T, incoming: T) => T;
  patch: (mutator: (draft: T) => void) => Promise<void>;
  getHistory: () => Promise<ModelHistory>;
  getSnapshot: () => Promise<T | null>;
  replace: (data: T) => Promise<void>;
  getCachedSnapshot: () => T | null;
  getCachedError: () => FirstTxError | null;
  getCachedHistory: () => ModelHistory;
  getCombinedSnapshot: () => CombinedSnapshot<T>;
  subscribe: (callback: () => void) => () => void;
  getSyncPromise: (
    fetcher: (current: T | null) => Promise<T>,
    options?: SyncPromiseOptions<T>,
  ) => Promise<T>;
};

export function defineModel<T>(
  name: string,
  options: {
    schema: z.ZodType<T>;
    version?: number;
    initialData?: T;
    ttl?: number;
    merge?: (current: T, incoming: T) => T;
  },
): Model<T>;
export function defineModel<T>(name: string, options: ModelOptions<T>): Model<T> {
  const effectiveTTL = options.ttl ?? DEFAULT_TTL_MS;
  const mergeFunction = options.merge ?? ((_, next: T) => next);

  const cacheManager = new CacheManager<T>(effectiveTTL);
  const storageManager = new StorageManager<T>({
    name,
    schema: options.schema,
    version: options.version,
    ttl: effectiveTTL,
    initialData: options.initialData,
  });
  const syncManager = new SyncManager<T>(name, cacheManager, storageManager, mergeFunction);

  const broadcaster = ModelBroadcaster.getInstance();
  // eslint-disable-next-line
  broadcaster.subscribe(name, async () => {
    const result = await storageManager.load();
    if (result) {
      cacheManager.updateWithData(result.data, result.history.updatedAt);
    }
  });

  const model: Model<T> = {
    name,
    schema: options.schema,
    ttl: effectiveTTL,
    merge: mergeFunction,

    getSnapshot: async (): Promise<T | null> => {
      const result = await storageManager.load();
      return result?.data ?? null;
    },

    getHistory: (): Promise<ModelHistory> => {
      return syncManager.getHistory();
    },

    replace: async (data: T): Promise<void> => {
      await syncManager.replace(data);
      broadcaster.broadcast({ type: 'model-replaced', key: name });
    },

    patch: async (mutator: (draft: T) => void): Promise<void> => {
      await syncManager.patch(mutator);
      broadcaster.broadcast({ type: 'model-patched', key: name });
    },

    getCachedSnapshot: (): T | null => {
      return cacheManager.getCachedSnapshot();
    },

    getCachedError: (): FirstTxError | null => {
      return cacheManager.getCachedError();
    },

    getCachedHistory: (): ModelHistory => {
      return cacheManager.getCachedHistory();
    },

    getCombinedSnapshot: (): CombinedSnapshot<T> => {
      return cacheManager.getCombinedSnapshot();
    },

    subscribe: (callback: () => void): (() => void) => {
      const unsubscribe = cacheManager.subscribe(callback);

      if (cacheManager.getSubscriberCount() === 1 && cacheManager.isLoading()) {
        model
          .getSnapshot()
          .then(async (data) => {
            if (data) {
              const history = await model.getHistory();
              cacheManager.updateWithData(data, history.updatedAt);
              cacheManager.setHistory(history);
            } else {
              cacheManager.setLoading();
            }
          })
          .catch((error: unknown) => {
            if (error instanceof FirstTxError) {
              cacheManager.updateWithError(error);
            } else {
              cacheManager.updateWithError(
                new StorageError(
                  error instanceof Error ? error.message : String(error),
                  'UNKNOWN',
                  true,
                  { key: name, operation: 'get' },
                ),
              );
            }
          });
      }

      return unsubscribe;
    },

    getSyncPromise: (
      fetcher: (current: T | null) => Promise<T>,
      syncOptions?: SyncPromiseOptions<T>,
    ): Promise<T> => {
      return syncManager.getSyncPromise(fetcher, syncOptions);
    },
  };

  emitModelEvent('init', {
    modelName: model.name,
    ttl: model.ttl,
    hasInitialData: !!options.initialData,
    version: options.version,
  });

  return model;
}
