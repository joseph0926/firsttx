declare const __FIRSTTX_DEV__: boolean;

import { DANGEROUS_ATTRIBUTES } from '@firsttx/shared';
import { STORAGE_CONFIG, type Snapshot, type SnapshotStyle } from './types';
import { openDB, resolveRouteKey, scrubSensitiveFields } from './utils';
import { CaptureError, PrepaintStorageError, convertDOMException } from './errors';
import { emitDevToolsEvent } from './devtools';

const isTestEnv = typeof process !== 'undefined' && !!process.env?.VITEST;

function getDocumentBaseUrl(): string | null {
  try {
    if (typeof document !== 'undefined') {
      const baseUri = document.baseURI;
      if (typeof baseUri === 'string' && baseUri && baseUri !== 'about:blank') {
        return baseUri;
      }
      const docUrl = (document as Document & { URL?: string }).URL;
      if (typeof docUrl === 'string' && docUrl && docUrl !== 'about:blank') {
        return docUrl;
      }
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      const { location } = window;
      if (location) {
        if (typeof location.href === 'string' && location.href) return location.href;
        if (typeof location.origin === 'string' && location.origin) return location.origin;
      }
    }
  } catch {}
  return null;
}

function getCurrentOrigin(): string | null {
  const base = getDocumentBaseUrl();
  if (!base) return null;
  try {
    const origin = new URL(base).origin;
    return origin === 'null' ? null : origin;
  } catch {}
  return null;
}

function resolveHref(href: string): URL | null {
  if (!href) return null;
  try {
    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = href;
      if (anchor.href) {
        return new URL(anchor.href);
      }
    }
  } catch {}
  const base = getDocumentBaseUrl();
  if (!base) return null;
  try {
    return new URL(href, base);
  } catch {}
  return null;
}

function saveSnapshot(db: IDBDatabase, snapshot: Snapshot): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    const request = store.put(snapshot);
    request.onerror = () => {
      const err = request.error;
      if (err) reject(convertDOMException(err, 'write'));
      else reject(new PrepaintStorageError('Unknown error saving snapshot', 'UNKNOWN', 'write'));
    };
    request.onsuccess = () => resolve();
  });
}

async function collectStyles(): Promise<SnapshotStyle[]> {
  const styles: SnapshotStyle[] = [];
  const fetchPromises: Promise<SnapshotStyle>[] = [];

  const elements = document.querySelectorAll('style, link[rel~="stylesheet"]');
  const currentOrigin = getCurrentOrigin();

  const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.hasAttribute('data-firsttx-prepaint')) continue;
    if (element instanceof HTMLStyleElement) {
      if (element.textContent) {
        styles.push({ type: 'inline', content: element.textContent });
      }
      continue;
    }
    if (!(element instanceof HTMLLinkElement)) continue;

    const relList = element.relList;

    const isStylesheet = relList ? relList.contains('stylesheet') : element.rel === 'stylesheet';
    if (!isStylesheet) continue;

    const href = element.getAttribute('href');
    if (!href) continue;

    const url = resolveHref(href);
    if (!url) continue;

    if (isTestEnv) {
      styles.push({ type: 'external', href: url.href });
      continue;
    }

    if (fetchFn && currentOrigin && url.origin === currentOrigin) {
      const promise = (async (): Promise<SnapshotStyle> => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            STORAGE_CONFIG.STYLE_FETCH_TIMEOUT,
          );
          try {
            const response = await fetchFn(url.href, {
              credentials: 'same-origin',
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.ok) {
              const text = await response.text();
              if (text) return { type: 'external', href: url.href, content: text };
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch {}
        return { type: 'external', href: url.href };
      })();
      fetchPromises.push(promise);
    } else {
      styles.push({ type: 'external', href: url.href });
    }
  }

  const fetchedStyles = await Promise.all(fetchPromises);
  styles.push(...fetchedStyles);

  return styles;
}

function serializeRoot(rootEl: HTMLElement): string {
  const first = rootEl.firstElementChild as HTMLElement | null;
  if (!first) return '';
  const clone = first.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('[data-firsttx-volatile]').forEach((el) => {
    el.textContent = '';
  });

  scrubSensitiveFields(clone);

  const allElements = [clone, ...Array.from(clone.querySelectorAll('*'))];
  allElements.forEach((el) => {
    DANGEROUS_ATTRIBUTES.forEach((attr) => {
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr);
      }
    });
  });

  return clone.outerHTML;
}

/**
 * Captures the current DOM state and saves it to IndexedDB for later restoration.
 *
 * This function serializes the first child of `#root`, collects all stylesheets,
 * and persists the snapshot to IndexedDB keyed by the current route.
 *
 * @description
 * The capture process:
 * 1. Serializes the first child of `#root` (clones to avoid mutations)
 * 2. Scrubs sensitive fields (password inputs, `[data-firsttx-sensitive]`)
 * 3. Clears volatile content (`[data-firsttx-volatile]`)
 * 4. Removes dangerous attributes (onclick, onerror, etc.)
 * 5. Collects inline styles and fetches same-origin external stylesheets
 * 6. Saves the snapshot to IndexedDB with timestamp
 *
 * @returns The captured snapshot, or null if capture failed
 *
 * @example
 * ```typescript
 * const snapshot = await captureSnapshot();
 * if (snapshot) {
 *   console.log(`Captured ${snapshot.body.length} bytes for ${snapshot.route}`);
 * }
 * ```
 */
export async function captureSnapshot(): Promise<Snapshot | null> {
  const captureStartTime = performance.now();
  const route = resolveRouteKey();

  let root: HTMLElement | null = null;
  let body: string;

  try {
    root = document.getElementById('root');
    if (!root) {
      throw new CaptureError('Root element not found', 'dom-serialize', route);
    }
    body = serializeRoot(root);
    if (!body) {
      throw new CaptureError('No valid child in root element', 'dom-serialize', route);
    }
  } catch (error) {
    const captureError =
      error instanceof CaptureError
        ? error
        : new CaptureError('Failed to serialize DOM', 'dom-serialize', route, error as Error);
    console.error(captureError.getDebugInfo());
    return null;
  }

  let styles: SnapshotStyle[];
  try {
    styles = await collectStyles();
  } catch (error) {
    const captureError = new CaptureError(
      'Failed to collect styles',
      'style-collect',
      route,
      error as Error,
    );
    console.error(captureError.getDebugInfo());
    return null;
  }

  const hasVolatile = root ? root.querySelectorAll('[data-firsttx-volatile]').length > 0 : false;

  const snapshot: Snapshot = {
    route,
    body,
    timestamp: Date.now(),
    styles: styles.length > 0 ? styles : undefined,
  };

  let db: IDBDatabase | null = null;
  try {
    db = await openDB();
    await saveSnapshot(db, snapshot);
    db.close();

    const captureDuration = performance.now() - captureStartTime;
    emitDevToolsEvent('capture', {
      route,
      bodySize: body.length,
      styleCount: styles.length,
      hasVolatile,
      duration: captureDuration,
    });
  } catch (error) {
    if (db) db.close();

    emitDevToolsEvent('storage.error', {
      operation: 'write',
      code: error instanceof Error ? error.name : 'UNKNOWN',
      recoverable: error instanceof PrepaintStorageError ? error.isRecoverable() : true,
      route,
    });

    const captureError =
      error instanceof PrepaintStorageError
        ? new CaptureError(error.message, 'db-write', route, error)
        : new CaptureError('Failed to save snapshot', 'db-write', route, error as Error);
    console.error(captureError.getDebugInfo());

    if (error instanceof PrepaintStorageError && !error.isRecoverable()) {
      return null;
    }
    return null;
  }

  if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
    console.log(`[FirstTx] Snapshot captured for ${route}`);
  }
  return snapshot;
}

/**
 * Options for configuring automatic snapshot capture.
 */
export interface SetupCaptureOptions {
  /** Limit capture to specific routes. If omitted, all routes are captured. */
  routes?: string[];
  /** Callback invoked after each successful capture. */
  onCapture?: (snapshot: Snapshot) => void;
}

let captureInitialized = false;

/**
 * Registers event listeners to automatically capture snapshots when the page
 * is about to be hidden or unloaded.
 *
 * This function sets up listeners for `visibilitychange`, `pagehide`, and
 * `beforeunload` events to trigger snapshot capture at the optimal moment
 * (when the user navigates away or switches tabs).
 *
 * @param options - Configuration options for capture behavior
 * @returns A cleanup function that removes all registered listeners
 *
 * @example
 * ```typescript
 * // In your app's entry point
 * import { setupCapture } from '@firsttx/prepaint';
 *
 * const cleanup = setupCapture({
 *   routes: ['/dashboard', '/profile'],
 *   onCapture: (snapshot) => {
 *     console.log('Snapshot saved:', snapshot.route);
 *   },
 * });
 *
 * // Later, if needed:
 * cleanup();
 * ```
 *
 * @remarks
 * - Only one capture setup is allowed per page. Subsequent calls return a no-op.
 * - Captures are debounced using `queueMicrotask` to prevent duplicates.
 * - The cleanup function resets the initialization flag, allowing re-setup.
 */
export function setupCapture(options?: SetupCaptureOptions): () => void {
  if (captureInitialized) return () => {};
  captureInitialized = true;
  let scheduled = false;
  const maybeSave = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const route = window.location.pathname;
      if (options?.routes && !options.routes.includes(route)) return;
      void captureSnapshot().then((snapshot) => {
        if (snapshot) options?.onCapture?.(snapshot);
      });
    });
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') maybeSave();
  };
  document.addEventListener('visibilitychange', onHidden, { capture: true });
  window.addEventListener('pagehide', maybeSave, { capture: true });
  const onBeforeUnload = () => {
    maybeSave();
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  return () => {
    captureInitialized = false;
    document.removeEventListener('visibilitychange', onHidden, { capture: true });
    window.removeEventListener('pagehide', maybeSave, { capture: true });
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}
