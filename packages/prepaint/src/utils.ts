import { STORAGE_CONFIG } from './types';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_CONFIG.DB_NAME, STORAGE_CONFIG.DB_VERSION);

    request.onerror = () => {
      const err = request.error;
      if (err) {
        reject(new Error(`IndexedDB error: ${err.message}`, { cause: err }));
      } else {
        reject(new Error('Unknown IndexedDB error'));
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_SNAPSHOTS)) {
        db.createObjectStore(STORAGE_CONFIG.STORE_SNAPSHOTS, { keyPath: 'route' });
      }
    };
  });
}

/**
 * Checks if ViewTransition API is available
 * @returns true if document exists and supports ViewTransition
 */
export function supportsViewTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof document.startViewTransition === 'function'
  );
}

const DEFAULT_SENSITIVE_SELECTORS = ['input[type="password"]', '[data-firsttx-sensitive]'] as const;

export function resolveRouteKey(): string {
  try {
    const override = (window as typeof window & { __FIRSTTX_ROUTE_KEY__?: unknown })
      .__FIRSTTX_ROUTE_KEY__;
    if (typeof override === 'function') {
      const route = override();
      if (typeof route === 'string' && route.trim().length > 0) return route;
    }
    if (typeof override === 'string' && override.trim().length > 0) {
      return override;
    }
  } catch {}

  try {
    const path = window.location?.pathname;
    if (typeof path === 'string' && path.length > 0) return path;
  } catch {}

  return '/';
}

function getCustomSensitiveSelectors(): string[] {
  try {
    const raw = (window as typeof window & { __FIRSTTX_SENSITIVE_SELECTORS__?: unknown })
      .__FIRSTTX_SENSITIVE_SELECTORS__;
    if (Array.isArray(raw)) {
      return raw
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  } catch {}
  return [];
}

export function getSensitiveSelectors(): string[] {
  const custom = getCustomSensitiveSelectors();
  const selectors = [...DEFAULT_SENSITIVE_SELECTORS, ...custom];
  return Array.from(new Set(selectors));
}

export function scrubSensitiveFields(root: HTMLElement): void {
  const selectors = getSensitiveSelectors();
  if (selectors.length === 0) return;

  const query = selectors.join(',');

  const elements = root.querySelectorAll<HTMLElement>(query);
  elements.forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = '';
      el.defaultValue = '';
    }
    el.textContent = '';
  });
}
