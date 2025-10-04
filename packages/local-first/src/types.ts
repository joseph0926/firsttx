import type { z } from 'zod';

/** Format stored in IndexedDB */
export interface StoredModel<T = unknown> {
  _v: number;
  updatedAt: number;
  data: T;
}

export interface ModelOptions<T> {
  /** Zod schema for validation */
  schema: z.ZodSchema<T>;
  /** TTL in milliseconds */
  ttl?: number;
  /** Multi-tab merge strategy (default: LWW) */
  merge?: (prev: T, next: T) => T;
  /** PII redaction before storage */
  redact?: (data: T) => T;
}

/** Snapshot retrieval result */
export interface SnapshotResult<T> {
  data: T | null;
  age: number;
  expired: boolean;
}

export interface Model<T> {
  readonly name: string;
  readonly options: ModelOptions<T>;

  getSnapshot(): Promise<SnapshotResult<T>>;
  saveSnapshot(data: T): Promise<void>;
}

/** IndexedDB schema */
export interface FirstTxDBSchema {
  models: {
    key: string;
    value: StoredModel;
  };
  tx_journal: {
    key: string;
    value: TxRecord;
  };
  settings: {
    key: string;
    value: unknown;
  };
}

/** Tx journal record (minimal type for Local-First layer) */
export interface TxRecord {
  id: string;
  label: string;
  createdAt: number;
  status: 'open' | 'committing' | 'committed' | 'rolledback';
}
