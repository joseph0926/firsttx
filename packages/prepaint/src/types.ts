export const STORAGE_CONFIG = {
  DB_NAME: 'firsttx-prepaint',
  DB_VERSION: 2,
  STORE_SNAPSHOTS: 'snapshots',
  MAX_SNAPSHOT_AGE: 7 * 24 * 60 * 60 * 1000,
  MAX_SNAPSHOT_BYTES: 1024 * 1024,
  STYLE_FETCH_TIMEOUT: 5000,
  IDLE_CAPTURE_TIMEOUT: 2000,
} as const;

export interface PrepaintPolicy {
  routes: readonly string[];
  ttlMs?: number;
  maxSnapshotBytes?: number;
  includeStyles?: boolean;
}

export interface Snapshot {
  route: string;
  body: string;
  timestamp: number;
  styles?: Array<SnapshotStyle | string>;
}

export type SnapshotStyle = InlineSnapshotStyle | ExternalSnapshotStyle;

export interface InlineSnapshotStyle {
  type: 'inline';
  content: string;
}

export interface ExternalSnapshotStyle {
  type: 'external';
  href: string;
  content?: string;
}
