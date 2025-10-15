import type { z } from 'zod';
import type { ModelHistory, ModelOptions } from './types';
import { Storage } from './storage';
import { FirstTxError, StorageError, ValidationError } from './errors';

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
};

export function defineModel<T>(
  name: string,
  options: {
    version: number;
    initialData: T;
    schema: z.ZodType<T>;
    ttl: number;
    merge?: (current: T, incoming: T) => T;
  },
): Model<T>;
export function defineModel<T>(
  name: string,
  options: {
    version?: never;
    initialData?: T;
    schema: z.ZodType<T>;
    ttl: number;
    merge?: (current: T, incoming: T) => T;
  },
): Model<T>;
export function defineModel<T>(name: string, options: ModelOptions<T>): Model<T> {
  let cacheState: CacheState<T> = { status: 'loading' };
  const subscribers = new Set<() => void>();

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
      isStale: age > options.ttl,
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

  const persist = async (storage: Storage, data: T, updatedAt: number) => {
    await storage.set(name, {
      _v: options.version ?? 1,
      updatedAt,
      data,
    });

    cacheState = { status: 'success', data };
    updateHistory(updatedAt);
    updateSnapshot();
    notifySubscribers();
  };

  const model: Model<T> = {
    name,
    schema: options.schema,
    ttl: options.ttl,
    merge: options.merge ?? ((_, next) => next),

    /**
     * Async snapshot retrieval from IndexedDB
     */
    getSnapshot: async () => {
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

        if (process.env.NODE_ENV !== 'production') {
          throw new ValidationError(
            `[FirstTx] Invalid data for model "${name}" - removed corrupted data`,
            name,
            parseResult.error,
          );
        }

        return null;
      }

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
        isStale: age > options.ttl,
        isConflicted: false,
      };
    },

    /**
     * Replaces entire model data (used for server sync)
     */
    replace: async (data: T): Promise<void> =>
      enqueue(async () => {
        const parseResult = options.schema.safeParse(data);
        if (!parseResult.success) {
          throw new ValidationError(
            `[FirstTx] Invalid data for model "${name}"`,
            name,
            parseResult.error,
          );
        }

        const storage = Storage.getInstance();
        const now = Date.now();

        await persist(storage, parseResult.data, now);
      }),

    /**
     * Patches model data with mutator function (used for optimistic updates)
     */
    patch: async (mutator: (draft: T) => void): Promise<void> =>
      enqueue(async () => {
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
          throw new ValidationError(
            `[FirstTx] Patch validation failed for model "${name}"`,
            name,
            parseResult.error,
          );
        }

        const now = Date.now();

        await persist(storage, parseResult.data, now);
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
  };

  return model;
}
