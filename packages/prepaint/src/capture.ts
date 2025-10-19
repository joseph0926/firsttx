declare const __FIRSTTX_DEV__: boolean;

import { STORAGE_CONFIG, type Snapshot, type SnapshotStyle } from './types';
import { openDB } from './utils';
import { CaptureError, PrepaintStorageError, convertDOMException } from './errors';

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
    const record: SnapshotStyle = { type: 'external', href: url.href };
    if (fetchFn && currentOrigin && url.origin === currentOrigin) {
      try {
        const response = await fetchFn(url.href, { credentials: 'same-origin' });
        if (response.ok) {
          const text = await response.text();
          if (text) record.content = text;
        }
      } catch {}
    }
    styles.push(record);
  }
  return styles;
}

function serializeRoot(rootEl: HTMLElement): string {
  const first = rootEl.firstElementChild as HTMLElement | null;
  if (!first) return '';
  const clone = first.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-firsttx-volatile]').forEach((el) => {
    el.textContent = '';
  });
  return clone.outerHTML;
}

export async function captureSnapshot(): Promise<Snapshot | null> {
  const route = window.location.pathname;

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
  } catch (error) {
    if (db) db.close();
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

export interface SetupCaptureOptions {
  routes?: string[];
  onCapture?: (snapshot: Snapshot) => void;
}

let captureInitialized = false;

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
