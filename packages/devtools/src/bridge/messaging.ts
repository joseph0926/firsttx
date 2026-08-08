import type { DevToolsEvent, CommandResponse } from './types';

export const BRIDGE_CHANNEL = 'firsttx-devtools';

export const EXTENSION_MESSAGE_SOURCE = '__FIRSTTX_EXTENSION__';
export const BRIDGE_MESSAGE_SOURCE = '__FIRSTTX_BRIDGE__';

export interface ExtensionMessage {
  source: typeof EXTENSION_MESSAGE_SOURCE;
  type: 'command' | 'buffer-request' | 'ping';
  data?: unknown;
}

export interface BridgeMessage {
  source: typeof BRIDGE_MESSAGE_SOURCE;
  type: 'event' | 'batch' | 'buffer-dump' | 'pong' | 'command-response';
  event?: DevToolsEvent;
  events?: DevToolsEvent[];
  response?: CommandResponse;
  timestamp?: number;
}

export function isExtensionMessage(data: unknown): data is ExtensionMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.source === EXTENSION_MESSAGE_SOURCE &&
    typeof msg.type === 'string' &&
    ['command', 'buffer-request', 'ping'].includes(msg.type)
  );
}

export function getCurrentOrigin(): string {
  if (typeof window === 'undefined') return '*';
  try {
    const { location } = window;
    if (location?.origin && location.origin !== 'null') {
      return location.origin;
    }
  } catch {
    // Security error in cross-origin context
  }
  return '*';
}
