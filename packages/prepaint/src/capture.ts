import { STORAGE_CONFIG, type Snapshot } from './types';
import { openDB } from './utils';

declare const __FIRSTTX_DEV__: boolean;

function saveSnapshot(db: IDBDatabase, snapshot: Snapshot): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    const request = store.put(snapshot);
    request.onerror = () => {
      const err = request.error;
      if (err) {
        reject(new Error(`Failed to save snapshot: ${err.message}`, { cause: err }));
      } else {
        reject(new Error('Unknown error saving snapshot'));
      }
    };
    request.onsuccess = () => resolve();
  });
}

function collectStyles(): string[] {
  const styles: string[] = [];
  document.querySelectorAll('style').forEach((styleEl) => {
    if (styleEl.hasAttribute('data-firsttx-prepaint')) return;
    if (styleEl.textContent) styles.push(styleEl.textContent);
  });
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
  try {
    const route = window.location.pathname;
    const root = document.getElementById('root');
    if (!root) return null;
    const body = serializeRoot(root);
    if (!body) return null;
    const styles = collectStyles();
    const snapshot: Snapshot = {
      route,
      body,
      timestamp: Date.now(),
      styles: styles.length > 0 ? styles : undefined,
    };
    const db = await openDB();
    await saveSnapshot(db, snapshot);
    db.close();
    if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
      console.log(`[FirstTx] Snapshot captured for ${route}`);
    }
    return snapshot;
  } catch (error) {
    console.error('[FirstTx] Capture failed:', error);
    return null;
  }
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
