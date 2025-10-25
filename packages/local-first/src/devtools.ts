declare const __FIRSTTX_DEV__: boolean;

interface DevToolsAPI {
  emit: (event: unknown) => void;
}

interface ModelInitData {
  modelName: string;
  ttl: number;
  hasInitialData: boolean;
  version?: number;
}

interface ModelLoadData {
  modelName: string;
  dataSize: number;
  age: number;
  isStale: boolean;
  duration: number;
}

interface ModelPatchData {
  modelName: string;
  operation: string;
  duration: number;
}

interface ModelReplaceData {
  modelName: string;
  dataSize: number;
  source: 'sync' | 'broadcast' | 'manual';
  duration: number;
}

interface ModelSyncStartData {
  modelName: string;
  trigger: 'mount' | 'manual' | 'stale';
  currentAge: number;
}

interface ModelSyncSuccessData {
  modelName: string;
  dataSize: number;
  duration: number;
  hadChanges: boolean;
}

interface ModelSyncErrorData {
  modelName: string;
  error: string;
  duration: number;
  willRetry: boolean;
}

interface ModelBroadcastData {
  modelName: string;
  operation: 'patch' | 'replace';
  senderId: string;
  receivedAt: number;
}

interface ModelValidationErrorData {
  modelName: string;
  error: string;
  path?: string;
}

const EVENT_PRIORITY: Record<string, number> = {
  init: 0,
  load: 0,
  patch: 0,
  broadcast: 0,
  replace: 1,
  'sync.start': 1,
  'sync.success': 1,
  'sync.error': 2,
  'validation.error': 2,
};

export function emitModelEvent(type: 'init', data: ModelInitData): void;
export function emitModelEvent(type: 'load', data: ModelLoadData): void;
export function emitModelEvent(type: 'patch', data: ModelPatchData): void;
export function emitModelEvent(type: 'replace', data: ModelReplaceData): void;
export function emitModelEvent(type: 'sync.start', data: ModelSyncStartData): void;
export function emitModelEvent(type: 'sync.success', data: ModelSyncSuccessData): void;
export function emitModelEvent(type: 'sync.error', data: ModelSyncErrorData): void;
export function emitModelEvent(type: 'broadcast', data: ModelBroadcastData): void;
export function emitModelEvent(type: 'validation.error', data: ModelValidationErrorData): void;

export function emitModelEvent(type: string, data: unknown): void {
  if (typeof window === 'undefined') return;

  try {
    const api = window.__FIRSTTX_DEVTOOLS__;
    if (!api || typeof api.emit !== 'function') return;

    const event = {
      id: crypto.randomUUID(),
      category: 'model' as const,
      type,
      timestamp: Date.now(),
      data,
      priority: EVENT_PRIORITY[type] ?? 1,
    };

    api.emit(event);
  } catch (error) {
    if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
      console.warn('[FirstTx Model] DevTools emit failed:', error);
    }
  }
}

declare global {
  interface Window {
    __FIRSTTX_DEVTOOLS__?: DevToolsAPI;
  }
}
