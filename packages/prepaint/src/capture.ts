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

async function captureSnapshot(): Promise<void> {
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
  } catch (error) {
    console.error('[FirstTx] Capture failed:', error);
  }
}

export interface CaptureOptions {
  /**
   * Capture on visibility change (tab switch)
   * @default true
   */
  onVisibilityChange?: boolean;
  /**
   * Capture before page unload
   * @default true
   */
  onBeforeUnload?: boolean;
}

export function setupCapture(options: CaptureOptions = {}): () => void {
  const { onVisibilityChange = true, onBeforeUnload = true } = options;

  const handlers: Array<{
    event: string;
    handler: () => void;
    target: typeof window | typeof document;
  }> = [];

  if (onVisibilityChange) {
    const visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        void captureSnapshot();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    handlers.push({ event: 'visibilitychange', handler: visibilityHandler, target: document });
  }

  if (onBeforeUnload) {
    const unloadHandler = () => {
      void captureSnapshot();
    };
    window.addEventListener('beforeunload', unloadHandler);
    handlers.push({ event: 'beforeunload', handler: unloadHandler, target: window });
  }

  return () => {
    handlers.forEach(({ event, handler, target }) => {
      target.removeEventListener(event, handler);
    });
  };
}
