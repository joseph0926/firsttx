export const STORAGE_CONFIG = {
  DB_NAME: 'firsttx-prepaint',
  DB_VERSION: 1,
  STORE_SNAPSHOTS: 'snapshots',
  MAX_SNAPSHOT_AGE: 7 * 24 * 60 * 60 * 1000,
} as const;

export interface Snapshot {
  route: string;
  body: string;
  timestamp: number;
  styles?: string[];
}
