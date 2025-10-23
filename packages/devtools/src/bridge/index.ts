import { getDevToolsBridge } from './core';
import { createSystemReadyEvent } from './helpers';
import type { BridgeConfig } from './types';
export type * from './types';
export * from './helpers';

export { getDevToolsBridge, destroyDevToolsBridge } from './core';

export function createDevToolsBridge(config?: BridgeConfig): void {
  const bridge = getDevToolsBridge(config);

  if (typeof window !== 'undefined') {
    window.__FIRSTTX_DEVTOOLS__ = {
      emit: (event) => bridge.emit(event),
      isConnected: () => bridge.isConnected(),
    };

    bridge.emit(
      createSystemReadyEvent({
        version: '0.1.0',
        hasIndexedDB: typeof indexedDB !== 'undefined',
        hasViewTransition: 'startViewTransition' in document,
        hasBroadcastChannel: typeof BroadcastChannel !== 'undefined',
      }),
    );
  }
}

if (typeof window !== 'undefined' && !window.__FIRSTTX_DEVTOOLS__) {
  createDevToolsBridge();
}

declare global {
  interface Window {
    __FIRSTTX_DEVTOOLS__?: {
      emit: (event: import('./types').DevToolsEvent) => void;
      isConnected: () => boolean;
    };
  }
}
