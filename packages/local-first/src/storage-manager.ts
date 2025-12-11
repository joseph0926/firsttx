import type { z } from 'zod';
import type { StoredModel, ModelHistory } from './types';
import { Storage } from './storage';
import { ValidationError } from './errors';
import { emitModelEvent } from './devtools';

export type LoadResult<T> = {
  data: T;
  history: ModelHistory;
  raw: StoredModel<T>;
};

export type StorageManagerOptions<T> = {
  name: string;
  schema: z.ZodType<T>;
  version?: number;
  ttl: number;
  initialData?: T;
};

export class StorageManager<T> {
  private readonly name: string;
  private readonly schema: z.ZodType<T>;
  private readonly version?: number;
  private readonly ttl: number;
  private readonly initialData?: T;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(options: StorageManagerOptions<T>) {
    this.name = options.name;
    this.schema = options.schema;
    this.version = options.version;
    this.ttl = options.ttl;
    this.initialData = options.initialData;
  }

  async load(): Promise<LoadResult<T> | null> {
    const loadStartTime = performance.now();
    const storage = Storage.getInstance();
    const stored = await storage.get<T>(this.name);

    if (!stored) {
      return null;
    }

    if (this.version && stored._v !== this.version) {
      await storage.delete(this.name);

      if (this.initialData) {
        const now = Date.now();
        await this.save(this.initialData);
        return {
          data: this.initialData,
          history: {
            updatedAt: now,
            age: 0,
            isStale: false,
            isConflicted: false,
          },
          raw: { _v: this.version, updatedAt: now, data: this.initialData },
        };
      }
      return null;
    }

    const parseResult = this.schema.safeParse(stored.data);
    if (!parseResult.success) {
      await storage.delete(this.name);

      emitModelEvent('validation.error', {
        modelName: this.name,
        error: parseResult.error.message,
        path: parseResult.error.issues[0]?.path.join('.'),
      });

      if (process.env.NODE_ENV !== 'production') {
        throw new ValidationError(
          `[FirstTx] Invalid data for model "${this.name}" - removed corrupted data`,
          this.name,
          parseResult.error,
        );
      }

      return null;
    }

    const loadDuration = performance.now() - loadStartTime;
    const age = Date.now() - stored.updatedAt;

    emitModelEvent('load', {
      modelName: this.name,
      dataSize: JSON.stringify(parseResult.data).length,
      age,
      isStale: age >= this.ttl,
      duration: loadDuration,
    });

    return {
      data: parseResult.data,
      history: {
        updatedAt: stored.updatedAt,
        age,
        isStale: age >= this.ttl,
        isConflicted: false,
      },
      raw: stored,
    };
  }

  async save(data: T): Promise<number> {
    const storage = Storage.getInstance();
    const now = Date.now();

    await storage.set(this.name, {
      _v: this.version ?? 1,
      updatedAt: now,
      data,
    });

    return now;
  }

  async delete(): Promise<void> {
    const storage = Storage.getInstance();
    await storage.delete(this.name);
  }

  validate(data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = this.schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  }

  enqueue<R>(operation: () => Promise<R>): Promise<R> {
    const run = this.operationQueue.then(operation);
    this.operationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  getInitialData(): T | undefined {
    return this.initialData;
  }

  getName(): string {
    return this.name;
  }

  getTTL(): number {
    return this.ttl;
  }
}
