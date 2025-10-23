import type { DevToolsAPI, DevToolsEvent } from './types';

export function createDevToolsBridge(): void {
  const api: DevToolsAPI = {
    emit(category, type, data) {
      console.log('[FirstTx DevTools]', category, type, data);
    },
  };

  window.__FIRSTTX_DEVTOOLS__ = api;
}

createDevToolsBridge();

export type { DevToolsAPI, DevToolsEvent };
