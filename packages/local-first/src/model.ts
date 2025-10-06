import type { z } from 'zod';
import type { ModelHistory, ModelOptions } from './types';
import { Storage } from './storage';

export type Model<T> = {
  name: string;
  schema: z.ZodType<T>;
  ttl: number;
  merge: (current: T, incoming: T) => T;
  patch: (mutator: (draft: T) => void) => Promise<void>;
  getHistory: () => Promise<ModelHistory>;
  getSnapshot: () => Promise<T | null>;
  replace: (data: T) => Promise<void>;
  // TODO: Phase 1 - markConflicted, clearConflict,,,
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
  const model: Model<T> = {
    name,
    schema: options.schema,
    ttl: options.ttl,
    merge: options.merge ?? ((_, next) => next),

    /**
     * getSnapshot
     * @description Returns a validated snapshot for use in the main app.
     * @returns Promise<T | null>
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
          throw new Error(`[FirstTx] Invalid data for model "${name}" - removed corrupted data`, {
            cause: parseResult.error,
          });
        }

        return null;
      }

      return parseResult.data ?? null;
    },

    /**
     * getHistory
     * @description Returns metadata about the model's state (age, staleness, conflicts).
     * @returns Promise<ModelHistory>
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
        isConflicted: false, // TODO: Phase 1
      };
    },

    /**
     * replace
     * @description Replaces the entire stored data with server data
     * @param data Server data to store
     */
    replace: async (data: T): Promise<void> => {
      const parseResult = options.schema.safeParse(data);
      if (!parseResult.success) {
        throw new Error(`[FirstTx] Invalid data for model "${name}"`, {
          cause: parseResult.error,
        });
      }

      const storage = Storage.getInstance();
      await storage.set(name, {
        _v: options.version ?? 1,
        updatedAt: Date.now(),
        data: parseResult.data,
      });
    },

    /**
     * patch
     * @description Mutates the draft object to update stored data
     * @param mutator Function that receives a draft and modifies it directly
     * @example
     * await model.patch(draft => {
     *   draft.items.push(newItem)
     * })
     */
    patch: async (mutator: (draft: T) => void): Promise<void> => {
      const storage = Storage.getInstance();
      let current: T | null = await model.getSnapshot();

      if (current === null) {
        if (options.initialData) {
          current = options.initialData;
        } else {
          throw new Error(
            `[FirstTx] Cannot patch model "${name}" - no data exists and no initialData provided`,
          );
        }
      }

      const next = structuredClone(current);
      mutator(next);

      const parseResult = options.schema.safeParse(next);
      if (!parseResult.success) {
        throw new Error(`[FirstTx] Patch validation failed for model "${name}"`, {
          cause: parseResult.error,
        });
      }

      await storage.set<T>(name, {
        _v: options.version ?? 1,
        updatedAt: Date.now(),
        data: parseResult.data,
      });

      // TODO: Phase 1 - BroadcastChannel
    },
  };

  return model;
}
