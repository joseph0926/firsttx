export type DevToolsEventCategory = 'prepaint' | 'local-first' | 'tx' | 'system';

export interface DevToolsEvent {
  category: DevToolsEventCategory;
  type: string;
  timestamp: number;
  data: unknown;
}

export interface DevToolsAPI {
  emit(category: DevToolsEventCategory, type: string, data: unknown): void;
}

declare global {
  interface Window {
    __FIRSTTX_DEVTOOLS__?: DevToolsAPI;
  }
}
