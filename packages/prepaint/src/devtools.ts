declare const __FIRSTTX_DEV__: boolean;

interface DevToolsAPI {
  emit: (event: unknown) => void;
}

type PrepaintEventType = 'capture' | 'restore' | 'handoff' | 'hydration.error' | 'storage.error';

interface PrepaintEvent<T = unknown> {
  id: string;
  category: 'prepaint';
  type: PrepaintEventType;
  timestamp: number;
  data: T;
  priority: number;
}

export interface PrepaintCaptureEvent extends PrepaintEvent<{
  route: string;
  bodySize: number;
  styleCount: number;
  hasVolatile: boolean;
  duration: number;
}> {
  type: 'capture';
}

export interface PrepaintRestoreEvent extends PrepaintEvent<{
  route: string;
  strategy: 'has-prepaint' | 'cold-start';
  snapshotAge: number;
  restoreDuration: number;
}> {
  type: 'restore';
}

export interface PrepaintHandoffEvent extends PrepaintEvent<{
  strategy: 'has-prepaint' | 'cold-start';
  canHydrate: boolean;
}> {
  type: 'handoff';
}

export interface PrepaintHydrationErrorEvent extends PrepaintEvent<{
  error: string;
  mismatchType: 'content' | 'attribute' | 'structure';
  recovered: boolean;
  route: string;
}> {
  type: 'hydration.error';
}

export interface PrepaintStorageErrorEvent extends PrepaintEvent<{
  operation: 'read' | 'write';
  code: string;
  recoverable: boolean;
  route: string;
}> {
  type: 'storage.error';
}

const EVENT_PRIORITY: Record<PrepaintEventType, number> = {
  capture: 0,
  restore: 1,
  handoff: 1,
  'hydration.error': 2,
  'storage.error': 2,
};

export function emitDevToolsEvent(type: 'capture', data: PrepaintCaptureEvent['data']): void;
export function emitDevToolsEvent(type: 'restore', data: PrepaintRestoreEvent['data']): void;
export function emitDevToolsEvent(type: 'handoff', data: PrepaintHandoffEvent['data']): void;
export function emitDevToolsEvent(
  type: 'hydration.error',
  data: PrepaintHydrationErrorEvent['data'],
): void;
export function emitDevToolsEvent(
  type: 'storage.error',
  data: PrepaintStorageErrorEvent['data'],
): void;

export function emitDevToolsEvent(type: PrepaintEventType, data: unknown): void {
  if (typeof window === 'undefined') return;

  try {
    const api = window.__FIRSTTX_DEVTOOLS__;
    if (!api || typeof api.emit !== 'function') return;

    const event = {
      id: crypto.randomUUID(),
      category: 'prepaint' as const,
      type,
      timestamp: Date.now(),
      data,
      priority: EVENT_PRIORITY[type],
    };

    api.emit(event);
  } catch (error) {
    if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
      console.warn('[FirstTx Prepaint] DevTools emit failed:', error);
    }
  }
}

declare global {
  interface Window {
    __FIRSTTX_DEVTOOLS__?: DevToolsAPI;
  }
}
