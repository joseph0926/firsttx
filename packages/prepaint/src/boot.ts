import { STORAGE_CONFIG, type Snapshot } from './types';
import { openDB } from './utils';

function getSnapshot(db: IDBDatabase, route: string): Promise<Snapshot | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORAGE_CONFIG.STORE_SNAPSHOTS);
    const request = store.get(route) as IDBRequest<Snapshot>;

    request.onerror = () => {
      const err = request.error;
      if (err) {
        reject(new Error(`Failed to get snapshot: ${err.message}`, { cause: err }));
      } else {
        reject(new Error('Unknown error getting snapshot'));
      }
    };

    request.onsuccess = () => resolve(request.result ?? null);
  });
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

    document.body.innerHTML = snapshot.body;

    if (snapshot.styles) {
      snapshot.styles.forEach((css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      });
    }

    document.documentElement.setAttribute('data-prepaint', 'true');
    document.documentElement.setAttribute('data-prepaint-timestamp', String(snapshot.timestamp));

    if (process.env.NODE_ENV === 'development') {
      console.log(`[FirstTx] Snapshot restored (age: ${age}ms)`);
    }
  } catch (error) {
    console.error('[FirstTx] Boot failed:', error);
  }
}
