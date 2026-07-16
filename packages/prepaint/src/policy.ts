import { STORAGE_CONFIG, type PrepaintPolicy, type Snapshot } from './types';

export interface ResolvedPrepaintPolicy {
  routes: string[];
  ttlMs: number;
  maxSnapshotBytes: number;
  includeStyles: boolean;
}

type PolicyParseResult = {
  value: ResolvedPrepaintPolicy | null;
  error: string | null;
};

type PrepaintGlobal = typeof globalThis & {
  __FIRSTTX_PREPAINT_POLICY__?: unknown;
};

function parsePolicy(policy: unknown): PolicyParseResult {
  if (policy === undefined || policy === null) {
    return { value: null, error: null };
  }

  if (typeof policy !== 'object') {
    return { value: null, error: 'policy must be an object' };
  }

  const candidate = policy as Partial<PrepaintPolicy>;
  if (!Array.isArray(candidate.routes)) {
    return { value: null, error: 'routes must be an array' };
  }

  const routes: string[] = [];
  for (const route of candidate.routes) {
    if (typeof route !== 'string' || !route.startsWith('/')) {
      return { value: null, error: 'every route must be an absolute pathname' };
    }
    if (!routes.includes(route)) routes.push(route);
  }

  if (routes.length === 0) {
    return { value: null, error: null };
  }

  const ttlMs = candidate.ttlMs ?? STORAGE_CONFIG.MAX_SNAPSHOT_AGE;
  if (typeof ttlMs !== 'number' || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    return { value: null, error: 'ttlMs must be a positive finite number' };
  }

  const maxSnapshotBytes = candidate.maxSnapshotBytes ?? STORAGE_CONFIG.MAX_SNAPSHOT_BYTES;
  if (
    typeof maxSnapshotBytes !== 'number' ||
    !Number.isSafeInteger(maxSnapshotBytes) ||
    maxSnapshotBytes <= 0
  ) {
    return { value: null, error: 'maxSnapshotBytes must be a positive safe integer' };
  }

  const includeStyles = candidate.includeStyles ?? true;
  if (typeof includeStyles !== 'boolean') {
    return { value: null, error: 'includeStyles must be a boolean' };
  }

  return {
    value: {
      routes,
      ttlMs,
      maxSnapshotBytes,
      includeStyles,
    },
    error: null,
  };
}

export function normalizePrepaintPolicy(policy: unknown): ResolvedPrepaintPolicy | null {
  return parsePolicy(policy).value;
}

export function validatePrepaintPolicy(policy: unknown): ResolvedPrepaintPolicy | null {
  const result = parsePolicy(policy);
  if (result.error) {
    throw new Error(`[FirstTx] Invalid prepaint policy: ${result.error}`);
  }
  return result.value;
}

export function setGlobalPrepaintPolicy(policy: unknown): ResolvedPrepaintPolicy | null {
  const resolved = normalizePrepaintPolicy(policy);
  (globalThis as PrepaintGlobal).__FIRSTTX_PREPAINT_POLICY__ = resolved;
  return resolved;
}

export function resolvePrepaintPolicy(
  policy?: PrepaintPolicy | null,
): ResolvedPrepaintPolicy | null {
  if (policy !== undefined) {
    return setGlobalPrepaintPolicy(policy);
  }
  return normalizePrepaintPolicy((globalThis as PrepaintGlobal).__FIRSTTX_PREPAINT_POLICY__);
}

export function isRouteAllowed(policy: ResolvedPrepaintPolicy | null, route: string): boolean {
  return policy?.routes.includes(route) ?? false;
}

function utf8ByteLength(value: string): number {
  if (typeof TextEncoder === 'function') {
    return new TextEncoder().encode(value).byteLength;
  }
  if (typeof Blob === 'function') {
    return new Blob([value]).size;
  }
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}|./g, 'x').length;
}

export function getSnapshotPayloadBytes(snapshot: Pick<Snapshot, 'body' | 'styles'>): number {
  return utf8ByteLength(
    JSON.stringify({
      body: snapshot.body,
      styles: snapshot.styles ?? [],
    }),
  );
}

export function shouldPruneSnapshot(
  value: unknown,
  policy: ResolvedPrepaintPolicy | null,
  now = Date.now(),
): boolean {
  if (!policy || !value || typeof value !== 'object') return true;

  const snapshot = value as Partial<Snapshot>;
  if (
    typeof snapshot.route !== 'string' ||
    typeof snapshot.body !== 'string' ||
    typeof snapshot.timestamp !== 'number'
  ) {
    return true;
  }

  if (!isRouteAllowed(policy, snapshot.route)) return true;
  if (now - snapshot.timestamp > policy.ttlMs) return true;
  if (getSnapshotPayloadBytes(snapshot as Snapshot) > policy.maxSnapshotBytes) return true;
  if (!policy.includeStyles && (snapshot.styles?.length ?? 0) > 0) return true;
  return false;
}

export function serializePrepaintPolicy(policy: unknown): string {
  return JSON.stringify(validatePrepaintPolicy(policy))
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
