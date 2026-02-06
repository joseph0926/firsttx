import type { ModelHistory } from './types';
import type { CacheManager } from './cache-manager';
import type { StorageManager } from './storage-manager';
import { emitModelEvent } from './devtools';
import { ValidationError } from './errors';

export type RevalidateMode = 'always' | 'stale' | 'never';

export type SyncPromiseOptions<T> = {
  revalidateOnMount?: RevalidateMode;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

type ReplaceSource = 'manual' | 'background';

type ReplaceOptions = {
  source?: ReplaceSource;
  expectedMutationVersion?: number;
};

export class SyncManager<T> {
  private syncPromise: Promise<T> | null = null;
  private cachedDataPromise: Promise<T> | null = null;
  private revalidationPromise: Promise<void> | null = null;
  private mutationVersion = 0;

  constructor(
    private readonly name: string,
    private readonly cacheManager: CacheManager<T>,
    private readonly storageManager: StorageManager<T>,
    private readonly merge: (current: T, incoming: T) => T,
  ) {}

  getSyncPromise(
    fetcher: (current: T | null) => Promise<T>,
    options?: SyncPromiseOptions<T>,
  ): Promise<T> {
    const cached = this.cacheManager.getCachedSnapshot();

    if (cached && this.cachedDataPromise) {
      return this.cachedDataPromise;
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    if (cached) {
      this.cachedDataPromise = Promise.resolve(cached);
      return this.cachedDataPromise;
    }

    this.syncPromise = this.executeSyncPromise(fetcher, options);
    return this.syncPromise;
  }

  private async executeSyncPromise(
    fetcher: (current: T | null) => Promise<T>,
    options?: SyncPromiseOptions<T>,
  ): Promise<T> {
    try {
      const result = await this.storageManager.load();

      if (result) {
        this.cacheManager.updateWithData(result.data, result.history.updatedAt);
        this.cacheManager.setHistory(result.history);

        const revalidateMode = options?.revalidateOnMount ?? 'always';
        const shouldRevalidate =
          revalidateMode === 'always' || (revalidateMode === 'stale' && result.history.isStale);

        if (shouldRevalidate) {
          void this.revalidateInBackground(result.data, fetcher, options);
        }

        this.cachedDataPromise = Promise.resolve(result.data);
        return result.data;
      }

      const data = await fetcher(null);
      await this.replace(data);
      options?.onSuccess?.(data);
      this.cachedDataPromise = Promise.resolve(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      options?.onError?.(error);
      throw error;
    } finally {
      this.syncPromise = null;
    }
  }

  // eslint-disable-next-line
  private async revalidateInBackground(
    current: T,
    fetcher: (current: T) => Promise<T>,
    options?: SyncPromiseOptions<T>,
  ): Promise<void> {
    if (this.revalidationPromise) return;

    this.revalidationPromise = (async () => {
      try {
        const expectedMutationVersion = this.mutationVersion;
        const fresh = await fetcher(current);
        await this.replace(fresh, {
          source: 'background',
          expectedMutationVersion,
        });

        emitModelEvent('revalidate', {
          modelName: this.name,
          source: 'background',
        });

        options?.onSuccess?.(fresh);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        options?.onError?.(error);

        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[FirstTx] Background revalidation failed for "${this.name}":`, err);
        }
      } finally {
        this.revalidationPromise = null;
      }
    })();
  }

  async replace(data: T, options?: ReplaceOptions): Promise<void> {
    return this.storageManager.enqueue(async () => {
      const replaceStartTime = performance.now();
      const source = options?.source ?? 'manual';

      if (
        source === 'background' &&
        typeof options?.expectedMutationVersion === 'number' &&
        this.mutationVersion !== options.expectedMutationVersion
      ) {
        return;
      }

      const validation = this.storageManager.validate(data);
      if (!validation.success) {
        emitModelEvent('validation.error', {
          modelName: this.name,
          error: validation.error.message,
          path: validation.error.issues[0]?.path.join('.'),
        });

        throw new ValidationError(
          `[FirstTx] Invalid data for model "${this.name}"`,
          this.name,
          validation.error,
        );
      }

      const existing = await this.storageManager.load();
      let merged: T;

      if (existing) {
        merged = this.merge(existing.data, validation.data);
      } else {
        merged = validation.data;
      }

      const updatedAt = await this.storageManager.save(merged);
      this.cacheManager.updateWithData(merged, updatedAt);
      this.cachedDataPromise = Promise.resolve(merged);
      if (source === 'manual') {
        this.mutationVersion++;
      }

      const replaceDuration = performance.now() - replaceStartTime;
      emitModelEvent('replace', {
        modelName: this.name,
        dataSize: JSON.stringify(merged).length,
        source,
        duration: replaceDuration,
      });
    });
  }

  async patch(mutator: (draft: T) => void): Promise<void> {
    return this.storageManager.enqueue(async () => {
      const patchStartTime = performance.now();

      const existing = await this.storageManager.load();
      let draft: T;

      if (existing) {
        draft = structuredClone(existing.data);
      } else {
        const initialData = this.storageManager.getInitialData();
        if (!initialData) {
          throw new Error(
            `[FirstTx] Cannot patch model "${this.name}" - no data exists and no initialData provided`,
          );
        }
        draft = structuredClone(initialData);
      }

      mutator(draft);

      const validation = this.storageManager.validate(draft);
      if (!validation.success) {
        emitModelEvent('validation.error', {
          modelName: this.name,
          error: validation.error.message,
          path: validation.error.issues[0]?.path.join('.'),
        });

        throw new ValidationError(
          `[FirstTx] Patch validation failed for model "${this.name}"`,
          this.name,
          validation.error,
        );
      }

      const updatedAt = await this.storageManager.save(validation.data);
      this.cacheManager.updateWithData(validation.data, updatedAt);
      this.cachedDataPromise = Promise.resolve(validation.data);
      this.mutationVersion++;

      const patchDuration = performance.now() - patchStartTime;
      emitModelEvent('patch', {
        modelName: this.name,
        operation: 'mutate',
        duration: patchDuration,
      });
    });
  }

  async getHistory(): Promise<ModelHistory> {
    const result = await this.storageManager.load();

    if (!result) {
      return {
        updatedAt: 0,
        age: Infinity,
        isStale: true,
        isConflicted: false,
      };
    }

    return result.history;
  }

  clearCachedPromise(): void {
    this.cachedDataPromise = null;
  }
}
