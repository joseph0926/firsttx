declare const __FIRSTTX_DEV__: boolean;

import { isRouteAllowed, resolvePrepaintPolicy } from './policy';
import { STORAGE_CONFIG, type PrepaintPolicy, type Snapshot } from './types';
import { openDB, pruneSnapshots, resolveRouteKey } from './utils';
import { mountOverlay } from './overlay';
import { BootError, PrepaintStorageError, convertDOMException } from './errors';
import { emitDevToolsEvent } from './devtools';

function getSnapshot(db: IDBDatabase, route: string): Promise<Snapshot | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    const request = store.get(route) as IDBRequest<Snapshot>;
    request.onerror = () => {
      const err = request.error;
      if (err) reject(convertDOMException(err, 'read'));
      else reject(new PrepaintStorageError('Unknown error getting snapshot', 'UNKNOWN', 'read'));
    };
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

function deleteSnapshot(db: IDBDatabase, route: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    const request = store.delete(route);
    request.onerror = () => {
      const err = request.error;
      if (err) reject(convertDOMException(err, 'delete'));
      else reject(new PrepaintStorageError('Unknown error deleting snapshot', 'UNKNOWN', 'delete'));
    };
    request.onsuccess = () => resolve();
  });
}

/**
 * Restores a cached DOM snapshot from IndexedDB during initial page load.
 *
 * This function is the core of prepaint's boot phase. It should be called
 * as early as possible in the page lifecycle (ideally via an inline script
 * in the document head) to minimize blank screen time.
 *
 * @description
 * The boot process:
 * 1. Opens IndexedDB and retrieves the snapshot for the current route
 * 2. Validates the snapshot structure and checks TTL (max 7 days)
 * 3. Restores the cached HTML and styles into a non-interactive overlay
 * 4. Leaves the React root untouched for a clean client render
 * 5. Sets `data-prepaint` attribute on `<html>` for handoff detection
 *
 * @returns Resolves when boot is complete (success or graceful failure)
 *
 * @example
 * ```html
 * <!-- In index.html, as early as possible -->
 * <script type="module">
 *   import { boot } from '@firsttx/prepaint/boot';
 *   boot().catch(console.error);
 * </script>
 * ```
 *
 * @throws Never throws - all errors are caught, logged, and recovered from.
 * The app will continue with a cold start if boot fails.
 */
export async function boot(policy?: PrepaintPolicy | null): Promise<void> {
  const restoreStartTime = performance.now();
  const route = resolveRouteKey();
  const resolvedPolicy = resolvePrepaintPolicy(policy);
  let db: IDBDatabase | null = null;

  try {
    db = await openDB();
  } catch (error) {
    emitDevToolsEvent('storage.error', {
      operation: 'read',
      code: error instanceof Error ? error.name : 'UNKNOWN',
      recoverable: true,
      route,
    });

    const bootError = new BootError('Failed to open IndexedDB', 'db-open', error as Error);
    console.error(bootError.getDebugInfo());
    return;
  }

  try {
    await pruneSnapshots(db, resolvedPolicy);
  } catch (error) {
    db.close();
    emitDevToolsEvent('storage.error', {
      operation: 'write',
      code: error instanceof Error ? error.name : 'UNKNOWN',
      recoverable: true,
      route,
    });
    const bootError = new BootError(
      'Failed to prune ineligible snapshots',
      'snapshot-read',
      error as Error,
    );
    console.error(bootError.getDebugInfo());
    return;
  }

  if (!resolvedPolicy || !isRouteAllowed(resolvedPolicy, route)) {
    db.close();
    return;
  }

  let snapshot: Snapshot | null = null;
  try {
    snapshot = await getSnapshot(db, route);
    db.close();
  } catch (error) {
    if (db) {
      try {
        await deleteSnapshot(db, route);
        if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
          console.log(`[FirstTx] Corrupted snapshot deleted for ${route}`);
        }
      } catch (deleteError) {
        if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
          console.warn('[FirstTx] Failed to delete corrupted snapshot:', deleteError);
        }
      }
      db.close();
    }

    emitDevToolsEvent('storage.error', {
      operation: 'read',
      code: error instanceof Error ? error.name : 'UNKNOWN',
      recoverable: true,
      route,
    });

    const bootError =
      error instanceof PrepaintStorageError
        ? new BootError(error.message, 'snapshot-read', error)
        : new BootError('Failed to read snapshot', 'snapshot-read', error as Error);
    console.error(bootError.getDebugInfo());
    return;
  }

  if (!snapshot) return;

  if (
    typeof snapshot.timestamp !== 'number' ||
    typeof snapshot.body !== 'string' ||
    snapshot.route !== route
  ) {
    try {
      const db2 = await openDB();
      await deleteSnapshot(db2, route);
      db2.close();
      if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
        console.log(`[FirstTx] Invalid snapshot structure deleted for ${route}`);
      }
    } catch (deleteError) {
      if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
        console.warn('[FirstTx] Failed to delete invalid snapshot:', deleteError);
      }
    }
    return;
  }

  const age = Date.now() - snapshot.timestamp;
  if (age > resolvedPolicy.ttlMs) {
    emitDevToolsEvent('restore', {
      route,
      strategy: 'cold-start',
      snapshotAge: age,
      restoreDuration: 0,
    });
    if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
      console.log(
        `[FirstTx] Snapshot too old (age: ${age}ms, max: ${resolvedPolicy.ttlMs}ms), skipping restore`,
      );
    }
    return;
  }

  try {
    mountOverlay(snapshot.body, resolvedPolicy.includeStyles ? snapshot.styles : undefined);
    document.documentElement.setAttribute('data-prepaint', 'true');
    document.documentElement.setAttribute('data-prepaint-overlay', 'true');
    document.documentElement.setAttribute('data-prepaint-timestamp', String(snapshot.timestamp));

    const restoreDuration = performance.now() - restoreStartTime;
    emitDevToolsEvent('restore', {
      route,
      strategy: 'has-prepaint',
      snapshotAge: age,
      restoreDuration,
    });

    if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
      console.log(`[FirstTx] Snapshot restored as overlay (age: ${age}ms)`);
    }
  } catch (error) {
    const bootError = new BootError('Failed to mount overlay', 'dom-restore', error as Error);
    console.error(bootError.getDebugInfo());
  }
}
