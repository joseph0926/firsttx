import type { z } from 'zod';

/**
 * StoredModel
 * @description Model type persisted to IndexedDB.
 */
export type StoredModel<T> = {
  /** Internal schema version for migrations. Updated by the system; read-only to consumers. */
  _v: number;
  /** Unix timestamp in milliseconds (epoch ms). */
  updatedAt: number;
  data: T;
};

/**
 * ModelOptions
 * @description Options you can pass to `defineModel()` when declaring a model.
 */
export interface ModelOptions<T> {
  /** Zod schema used for validation (parse/transform). */
  schema: z.ZodType<T>;
  /**
   * User-bumped version to force a refresh/re-fetch.
   * When provided, `initialData` should also be provided (to be enforced via overloads).
   */
  version?: number;
  /**
   * Initial value written at first creation or when `version` changes.
   * Required if `version` is set (to be enforced via overloads).
   */
  initialData?: T;
  /**
   * Time-to-live in milliseconds. `Infinity` is allowed for "never expires".
   */
  ttl?: number;
  /**
   * Conflict-resolution function. Receives the current value and an incoming value,
   * and must return the resolved value to persist.
   */
  merge?: (current: T, incoming: T) => T;

  // TODO: Phase 1
  // redact?: Record<string, boolean>
  // migrate?: (old: unknown, fromVersion: number) => T
}

/**
 * ModelHistory
 * @description Metadata about a model's state, returned by `useModel` hook.
 */
export interface ModelHistory {
  /** Unix timestamp in milliseconds when this model was last updated. */
  updatedAt: number;
  /** Milliseconds since last update (calculated as Date.now() - updatedAt). */
  age: number;
  /** age > ttl */
  isStale: boolean;
  /** Whether this model is in a conflicted state (multi-tab collision). */
  isConflicted: boolean; // TODO: Phase 1 - implement conflict detection
}

export type SyncOptions<T> = {
  /**
   * When to sync on component mount
   * @default 'stale'
   *
   * - 'always': Always sync on mount, regardless of data freshness
   * - 'stale': Sync only if data is stale (exceeds TTL)
   * - 'never': Never auto-sync, only manual sync() calls
   */
  syncOnMount?: 'always' | 'stale' | 'never';
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export type SyncedModelResult<T> = {
  data: T | null;
  patch: (mutator: (draft: T) => void) => Promise<void>;
  sync: () => Promise<void>;
  isSyncing: boolean;
  error: Error | null;
  history: ModelHistory;
};

export type Fetcher<T> = (current: T | null) => Promise<T>;
