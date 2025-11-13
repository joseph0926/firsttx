export { defineModel } from './model';
export type { Model } from './model';

export { Storage } from './storage';

export type {
  StoredModel,
  ModelOptions,
  ModelHistory,
  SyncOptions,
  SyncedModelResult,
  Fetcher,
  SuspenseFetcher,
  SuspenseSyncOptions,
} from './types';

export { useModel, useSyncedModel } from './hooks';
export { useSuspenseSyncedModel } from './suspense';

export { FirstTxError, StorageError, ValidationError } from './errors';
export type { StorageErrorCode } from './errors';
