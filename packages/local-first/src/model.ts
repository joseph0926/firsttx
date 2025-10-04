import type { Model, ModelOptions, SnapshotResult, StoredModel } from './types';
import { getModelSnapshot, saveModelSnapshot } from './db';

class ModelImpl<T> implements Model<T> {
  constructor(
    public readonly name: string,
    public readonly options: ModelOptions<T>,
  ) {}

  async getSnapshot(): Promise<SnapshotResult<T>> {
    const stored = await getModelSnapshot<T>(this.name);

    if (!stored) {
      return { data: null, age: 0, expired: false };
    }

    const now = Date.now();
    const age = now - stored.updatedAt;

    const parseResult = this.options.schema.safeParse(stored.data);
    if (!parseResult.success) {
      return { data: null, age: 0, expired: true };
    }

    const expired = this.options.ttl !== undefined && age > this.options.ttl;

    return {
      data: parseResult.data,
      age,
      expired,
    };
  }

  async saveSnapshot(data: T): Promise<void> {
    const redacted = this.options.redact ? this.options.redact(data) : data;

    const validated = this.options.schema.parse(redacted);

    const stored: StoredModel<T> = {
      _v: 1, // TODO: version management
      updatedAt: Date.now(),
      data: validated,
    };

    await saveModelSnapshot(this.name, stored);
  }
}

/**
 * Define a model with schema and policies
 */
export function defineModel<T>(name: string, options: ModelOptions<T>): Model<T> {
  return new ModelImpl(name, options);
}
