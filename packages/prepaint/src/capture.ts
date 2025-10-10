import { STORAGE_CONFIG, type Snapshot } from './types';
import { openDB } from './utils';

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
    if (styleEl.textContent) {
      styles.push(styleEl.textContent);
    }
  });

  return styles;
}

export async function captureSnapshot(): Promise<Snapshot | null> {
  try {
    const route = window.location.pathname;
    const body = document.body.innerHTML;
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

    if (process.env.NODE_ENV === 'development') {
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

/**
 * setupCapture
 * @description Setup automatic snapshot capture on page unload Should be called once per app lifecycle
 */
export function setupCapture(options?: SetupCaptureOptions): () => void {
  if (captureInitialized) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[FirstTx] setupCapture already called');
    }
    return () => {};
  }

  captureInitialized = true;

  const unloadHandler = () => {
    const route = window.location.pathname;

    if (options?.routes && !options.routes.includes(route)) {
      return;
    }

    void captureSnapshot().then((snapshot) => {
      if (snapshot) {
        options?.onCapture?.(snapshot);
      }
    });
  };

  window.addEventListener('beforeunload', unloadHandler);

  return () => {
    captureInitialized = false;
    window.removeEventListener('beforeunload', unloadHandler);
  };
}
