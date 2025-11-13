import type { z } from 'zod';
import type { ModelHistory, ModelOptions } from './types';
import { Storage } from './storage';
import { FirstTxError, StorageError, ValidationError } from './errors';
import { ModelBroadcaster } from './broadcast';
import { emitModelEvent } from './devtools';

/**
 * Internal cache state
 */
export type CacheState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: FirstTxError };

/**
 * Combined snapshot for React integration
 */
export type CombinedSnapshot<T> = {
  data: T | null;
  error: FirstTxError | null;
  history: ModelHistory;
};

export type SyncPromiseOptions<T> = {
  revalidateOnMount?: 'always' | 'stale' | 'never';
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

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
    version: number;
    initialData: T;
    schema: z.ZodType<T>;
    ttl?: number;
    merge?: (current: T, incoming: T) => T;
  },
): Model<T>;
export function defineModel<T>(
  name: string,
  options: {
    version?: never;
    initialData?: T;
    schema: z.ZodType<T>;
    ttl?: number;
    merge?: (current: T, incoming: T) => T;
  },
): Model<T>;
export function defineModel<T>(name: string, options: ModelOptions<T>): Model<T> {
  let cacheState: CacheState<T> = { status: 'loading' };
  const subscribers = new Set<() => void>();

  const effectiveTTL = options.ttl ?? 5 * 60 * 1000;

  let cachedHistory: ModelHistory = {
    updatedAt: 0,
    age: Infinity,
    isStale: true,
    isConflicted: false,
  };

  let cachedSnapshot: CombinedSnapshot<T> = {
    data: null,
    error: null,
    history: cachedHistory,
  };

  let syncPromise: Promise<T> | null = null;
  let cachedDataPromise: Promise<T> | null = null;
  let revalidationPromise: Promise<void> | null = null;

  const notifySubscribers = () => {
    subscribers.forEach((fn) => fn());
  };

  /**
   * Updates cached history with current timestamp
   */
  const updateHistory = (updatedAt: number) => {
    const age = Date.now() - updatedAt;
    cachedHistory = {
      updatedAt,
      age,
      isStale: age >= effectiveTTL,
      isConflicted: false,
    };
  };

  /**
   * Updates combined snapshot (creates new reference only when state changes)
   */
  const updateSnapshot = () => {
    const newData = cacheState.status === 'success' ? cacheState.data : null;
    const newError = cacheState.status === 'error' ? cacheState.error : null;

    if (
      cachedSnapshot.data === newData &&
      cachedSnapshot.error === newError &&
      cachedSnapshot.history === cachedHistory
    ) {
      return;
    }

    cachedSnapshot = {
      data: newData,
      error: newError,
      history: cachedHistory,
    };
  };

  let operationQueue: Promise<void> = Promise.resolve();
  const enqueue = <R>(operation: () => Promise<R>): Promise<R> => {
    const run = operationQueue.then(operation);
    operationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const updateCache = (data: T, updatedAt: number) => {
    cacheState = { status: 'success', data };
    updateHistory(updatedAt);
    updateSnapshot();
    cachedDataPromise = null;
    notifySubscribers();
  };

  const reloadCache = async () => {
    const storage = Storage.getInstance();
    const stored = await storage.get<T>(name);
    if (stored) {
      updateCache(stored.data, stored.updatedAt);
    }
  };

  const persist = async (storage: Storage, data: T, updatedAt: number) => {
    await storage.set(name, {
      _v: options.version ?? 1,
      updatedAt,
      data,
    });
    updateCache(data, updatedAt);
  };

  const broadcaster = ModelBroadcaster.getInstance();
  broadcaster.subscribe(name, () => {
    void reloadCache();
  });

  const getSnapshotWithMeta = async (): Promise<{
    data: T;
    history: ModelHistory;
  } | null> => {
    const loadStartTime = performance.now();
    const storage = Storage.getInstance();
    const stored = await storage.get<T>(name);

    if (!stored) {
      return null;
    }

    if (options.version && stored._v !== options.version) {
      await storage.delete(name);

      if (!options.initialData) {
        throw new Error('[FirstTx] Unreachable: version set but no initialData');
      }
      await model.replace(options.initialData);

      return {
        data: options.initialData,
        history: {
          updatedAt: Date.now(),
          age: 0,
          isStale: false,
          isConflicted: false,
        },
      };
    }

    const parseResult = options.schema.safeParse(stored.data);
    if (!parseResult.success) {
      await storage.delete(name);

      emitModelEvent('validation.error', {
        modelName: name,
        error: parseResult.error.message,
        path: parseResult.error.issues[0]?.path.join('.'),
      });

      if (process.env.NODE_ENV !== 'production') {
        throw new ValidationError(
          `[FirstTx] Invalid data for model "${name}" - removed corrupted data`,
          name,
          parseResult.error,
        );
      }

      return null;
    }

    const loadDuration = performance.now() - loadStartTime;
    const age = Date.now() - stored.updatedAt;

    emitModelEvent('load', {
      modelName: name,
      dataSize: JSON.stringify(parseResult.data).length,
      age,
      isStale: age >= effectiveTTL,
      duration: loadDuration,
    });

    return {
      data: parseResult.data,
      history: {
        updatedAt: stored.updatedAt,
        age,
        isStale: age >= effectiveTTL,
        isConflicted: false,
      },
    };
  };

  const revalidateInBackground = async (
    current: T,
    fetcher: (current: T) => Promise<T>,
    options?: SyncPromiseOptions<T>,
    // eslint-disable-next-line
  ) => {
    if (revalidationPromise) return;

    revalidationPromise = (async () => {
      try {
        const fresh = await fetcher(current);
        await model.replace(fresh);

        emitModelEvent('revalidate', {
          modelName: name,
          source: 'background',
        });

        options?.onSuccess?.(fresh);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        options?.onError?.(error);

        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[FirstTx] Background revalidation failed for "${name}":`, err);
        }
      } finally {
        revalidationPromise = null;
      }
    })();
  };

  const model: Model<T> = {
    name,
    schema: options.schema,
    ttl: effectiveTTL,
    merge: options.merge ?? ((_, next) => next),

    /**
     * Async snapshot retrieval from IndexedDB
     */
    getSnapshot: async () => {
      const loadStartTime = performance.now();
      const storage = Storage.getInstance();
      const stored = await storage.get<T>(name);

      if (!stored) {
        return null;
      }

      if (options.version && stored._v !== options.version) {
        await storage.delete(name);

        if (!options.initialData) {
          throw new Error('[FirstTx] Unreachable: version set but no initialData');
        }
        await model.replace(options.initialData);
        return options.initialData;
      }

      const parseResult = options.schema.safeParse(stored.data);
      if (!parseResult.success) {
        await storage.delete(name);

        emitModelEvent('validation.error', {
          modelName: name,
          error: parseResult.error.message,
          path: parseResult.error.issues[0]?.path.join('.'),
        });

        if (process.env.NODE_ENV !== 'production') {
          throw new ValidationError(
            `[FirstTx] Invalid data for model "${name}" - removed corrupted data`,
            name,
            parseResult.error,
          );
        }

        return null;
      }

      const loadDuration = performance.now() - loadStartTime;
      const age = Date.now() - stored.updatedAt;

      emitModelEvent('load', {
        modelName: name,
        dataSize: JSON.stringify(parseResult.data).length,
        age,
        isStale: age >= effectiveTTL,
        duration: loadDuration,
      });

      return parseResult.data ?? null;
    },

    /**
     * Async history retrieval from IndexedDB
     */
    getHistory: async (): Promise<ModelHistory> => {
      const storage = Storage.getInstance();
      const stored = await storage.get<T>(name);

      if (!stored) {
        return {
          updatedAt: 0,
          age: Infinity,
          isStale: true,
          isConflicted: false,
        };
      }

      const age = Date.now() - stored.updatedAt;

      return {
        updatedAt: stored.updatedAt,
        age,
        isStale: age >= effectiveTTL,
        isConflicted: false,
      };
    },

    /**
     * Replaces entire model data (used for server sync)
     */
    replace: async (data: T): Promise<void> =>
      enqueue(async () => {
        const replaceStartTime = performance.now();
        const parseResult = options.schema.safeParse(data);
        if (!parseResult.success) {
          emitModelEvent('validation.error', {
            modelName: name,
            error: parseResult.error.message,
            path: parseResult.error.issues[0]?.path.join('.'),
          });

          throw new ValidationError(
            `[FirstTx] Invalid data for model "${name}"`,
            name,
            parseResult.error,
          );
        }

        const storage = Storage.getInstance();
        const now = Date.now();

        await persist(storage, parseResult.data, now);

        broadcaster.broadcast({ type: 'model-replaced', key: name });

        const replaceDuration = performance.now() - replaceStartTime;

        emitModelEvent('replace', {
          modelName: name,
          dataSize: JSON.stringify(parseResult.data).length,
          source: 'manual',
          duration: replaceDuration,
        });
      }),

    /**
     * Patches model data with mutator function (used for optimistic updates)
     */
    patch: async (mutator: (draft: T) => void): Promise<void> =>
      enqueue(async () => {
        const patchStartTime = performance.now();
        const storage = Storage.getInstance();
        const stored = await storage.get<T>(name);

        let draft: T;

        if (!stored) {
          if (!options.initialData) {
            throw new Error(
              `[FirstTx] Cannot patch model "${name}" - no data exists and no initialData provided`,
            );
          }

          draft = structuredClone(options.initialData);
        } else if (options.version && stored._v !== options.version) {
          await storage.delete(name);

          if (!options.initialData) {
            throw new Error(
              `[FirstTx] Cannot patch model "${name}" - stored data is outdated and no initialData provided`,
            );
          }

          draft = structuredClone(options.initialData);
        } else {
          const parseStored = options.schema.safeParse(stored.data);

          if (!parseStored.success) {
            await storage.delete(name);

            emitModelEvent('validation.error', {
              modelName: name,
              error: parseStored.error.message,
              path: parseStored.error.issues[0]?.path.join('.'),
            });

            if (process.env.NODE_ENV !== 'production') {
              throw new ValidationError(
                `[FirstTx] Invalid data for model "${name}" - removed corrupted data`,
                name,
                parseStored.error,
              );
            }

            if (!options.initialData) {
              throw new Error(
                `[FirstTx] Cannot patch model "${name}" - no data exists and no initialData provided`,
              );
            }

            draft = structuredClone(options.initialData);
          } else {
            draft = structuredClone(parseStored.data);
          }
        }

        mutator(draft);

        const parseResult = options.schema.safeParse(draft);
        if (!parseResult.success) {
          emitModelEvent('validation.error', {
            modelName: name,
            error: parseResult.error.message,
            path: parseResult.error.issues[0]?.path.join('.'),
          });

          throw new ValidationError(
            `[FirstTx] Patch validation failed for model "${name}"`,
            name,
            parseResult.error,
          );
        }

        const now = Date.now();

        await persist(storage, parseResult.data, now);

        broadcaster.broadcast({ type: 'model-patched', key: name });

        const patchDuration = performance.now() - patchStartTime;
        emitModelEvent('patch', {
          modelName: name,
          operation: 'mutate',
          duration: patchDuration,
        });
      }),

    getCachedSnapshot: () => {
      return cacheState.status === 'success' ? cacheState.data : null;
    },

    getCachedError: () => {
      return cacheState.status === 'error' ? cacheState.error : null;
    },

    getCachedHistory: () => {
      return cachedHistory;
    },

    /**
     * Returns combined snapshot with stable reference (prevents infinite loops)
     */
    getCombinedSnapshot: () => {
      return cachedSnapshot;
    },

    /**
     * Subscribes to model changes (React integration)
     */
    subscribe: (callback) => {
      subscribers.add(callback);

      if (subscribers.size === 1 && cacheState.status === 'loading') {
        model
          .getSnapshot()
          .then(async (data) => {
            if (data) {
              cacheState = { status: 'success', data };
              const history = await model.getHistory();
              cachedHistory = history;
              updateSnapshot();
              notifySubscribers();
            } else {
              cacheState = { status: 'loading' };
              updateSnapshot();
              notifySubscribers();
            }
          })
          .catch((error: unknown) => {
            if (error instanceof FirstTxError) {
              cacheState = { status: 'error', error };
            } else {
              cacheState = {
                status: 'error',
                error: new StorageError(
                  error instanceof Error ? error.message : String(error),
                  'UNKNOWN',
                  true,
                  { key: name, operation: 'get' },
                ),
              };
            }
            updateSnapshot();
            notifySubscribers();
          });
      }

      return () => {
        subscribers.delete(callback);
      };
    },

    getSyncPromise: (fetcher, syncOptions) => {
      const cached = model.getCachedSnapshot();
      if (cached && cachedDataPromise) {
        return cachedDataPromise;
      }

      if (syncPromise) {
        return syncPromise;
      }

      if (cached) {
        cachedDataPromise = Promise.resolve(cached);
        return cachedDataPromise;
      }

      syncPromise = (async () => {
        try {
          const result = await getSnapshotWithMeta();

          if (result) {
            cacheState = { status: 'success', data: result.data };
            cachedHistory = result.history;
            updateSnapshot();

            const revalidateMode = syncOptions?.revalidateOnMount ?? 'always';
            const shouldRevalidate =
              revalidateMode === 'always' || (revalidateMode === 'stale' && result.history.isStale);

            if (shouldRevalidate) {
              void revalidateInBackground(result.data, fetcher, syncOptions);
            }

            cachedDataPromise = Promise.resolve(result.data);
            return result.data;
          }

          const data = await fetcher(null);
          await model.replace(data);
          syncOptions?.onSuccess?.(data);
          cachedDataPromise = Promise.resolve(data);
          return data;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          syncOptions?.onError?.(error);
          throw error;
        } finally {
          syncPromise = null;
        }
      })();

      return syncPromise;
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
