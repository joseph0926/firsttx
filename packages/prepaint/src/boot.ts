declare const __FIRSTTX_DEV__: boolean;

import { STORAGE_CONFIG, type Snapshot, type SnapshotStyle } from './types';
import { openDB } from './utils';
import { mountOverlay } from './overlay';
import { normalizeSnapshotStyleEntry } from './style-utils';

function getSnapshot(db: IDBDatabase, route: string): Promise<Snapshot | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    const request = store.get(route) as IDBRequest<Snapshot>;
    request.onerror = () => {
      const err = request.error;
      if (err) reject(new Error(`Failed to get snapshot: ${err.message}`, { cause: err }));
      else reject(new Error('Unknown error getting snapshot'));
    };
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

function extractSingleRoot(html: string): string | null {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const first = tmp.firstElementChild as HTMLElement | null;
  return first ? first.outerHTML : null;
}

function shouldUseOverlay(route: string): boolean {
  try {
    const g = window.__FIRSTTX_OVERLAY__;
    if (g === true) return true;
    const v = localStorage.getItem('firsttx:overlay');
    if (v === '1' || v === 'true') return true;
    const list = localStorage.getItem('firsttx:overlayRoutes');
    if (list) {
      const arr = list
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const pat of arr) if (route.startsWith(pat)) return true;
    }
  } catch {}
  return false;
}

export async function boot(): Promise<void> {
  try {
    const route = window.location.pathname;
    const db = await openDB();
    const snapshot = await getSnapshot(db, route);
    db.close();
    if (!snapshot) return;
    const age = Date.now() - snapshot.timestamp;
    if (age > STORAGE_CONFIG.MAX_SNAPSHOT_AGE) return;

    const overlay = shouldUseOverlay(route);
    if (overlay) {
      mountOverlay(snapshot.body, snapshot.styles);
      document.documentElement.setAttribute('data-prepaint', 'true');
      document.documentElement.setAttribute('data-prepaint-overlay', 'true');
      document.documentElement.setAttribute('data-prepaint-timestamp', String(snapshot.timestamp));
      if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
        console.log(`[FirstTx] Snapshot restored as overlay (age: ${age}ms)`);
      }
      return;
    }

    const root = document.getElementById('root');
    if (!root) return;
    const clean = extractSingleRoot(snapshot.body);
    if (!clean) return;
    root.innerHTML = clean;

    if (snapshot.styles) {
      snapshot.styles.forEach((entry) => {
        const normalized = normalizeSnapshotStyleEntry(entry);
        if (normalized) appendStyleResource(normalized);
      });
    }

    document.documentElement.setAttribute('data-prepaint', 'true');
    document.documentElement.setAttribute('data-prepaint-timestamp', String(snapshot.timestamp));

    if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
      console.log(`[FirstTx] Snapshot restored (age: ${age}ms)`);
    }
  } catch (error) {
    console.error('[FirstTx] Boot failed:', error);
  }
}

function appendStyleResource(style: SnapshotStyle): void {
  if (style.type === 'inline' || style.content) {
    const element = document.createElement('style');
    element.setAttribute('data-firsttx-prepaint', '');
    element.textContent = style.type === 'inline' ? style.content : (style.content ?? '');
    document.head.appendChild(element);
    return;
  }
  const link = document.createElement('link');
  link.setAttribute('data-firsttx-prepaint', '');
  link.rel = 'stylesheet';
  link.href = style.href;
  document.head.appendChild(link);
}
