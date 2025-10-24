import type { DevToolsEvent, DevToolsCommand, CommandResponse } from '../bridge/types';

export const BRIDGE_MESSAGE_SOURCE = '__FIRSTTX_BRIDGE__';
export const EXTENSION_MESSAGE_SOURCE = '__FIRSTTX_EXTENSION__';

export interface BridgeMessage {
  source: typeof BRIDGE_MESSAGE_SOURCE;
  type: 'event' | 'batch' | 'buffer-dump' | 'pong' | 'command-response';
  event?: DevToolsEvent;
  events?: DevToolsEvent[];
  response?: CommandResponse;
  timestamp?: number;
}

export function isBridgeMessage(data: unknown): data is BridgeMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.source === BRIDGE_MESSAGE_SOURCE &&
    typeof msg.type === 'string' &&
    ['event', 'batch', 'buffer-dump', 'pong', 'command-response'].includes(msg.type)
  );
}

export interface ContentToBackgroundMessage {
  type: 'bridge-event';
  data: BridgeMessage;
  tabId?: number;
  timestamp?: number;
}

export function isContentToBackgroundMessage(data: unknown): data is ContentToBackgroundMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return msg.type === 'bridge-event' && isBridgeMessage(msg.data);
}

export interface BackgroundToContentMessage {
  type: 'devtools-command';
  data: DevToolsCommand;
}

export function isBackgroundToContentMessage(data: unknown): data is BackgroundToContentMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return msg.type === 'devtools-command' && msg.data !== null && typeof msg.data === 'object';
}

export interface ExtensionToBridgeMessage {
  source: typeof EXTENSION_MESSAGE_SOURCE;
  type: 'command' | 'buffer-request' | 'ping';
  data?: DevToolsCommand;
}

export function isExtensionToBridgeMessage(data: unknown): data is ExtensionToBridgeMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.source === EXTENSION_MESSAGE_SOURCE &&
    typeof msg.type === 'string' &&
    ['command', 'buffer-request', 'ping'].includes(msg.type)
  );
}

export interface BackgroundToDevToolsMessage {
  type: 'events' | 'connection-status';
  events?: DevToolsEvent[];
  connected?: boolean;
}

export interface DevToolsToBackgroundMessage {
  type: 'init' | 'command' | 'disconnect';
  command?: DevToolsCommand;
  tabId?: number;
}

export interface MessageResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface ContentScriptResponse extends MessageResponse {
  tabId?: number;
}

export interface BackgroundResponse extends MessageResponse {
  forwarded?: boolean;
}

export function validateMessage<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
): T | null {
  try {
    return validator(data) ? data : null;
  } catch (error) {
    console.error('[FirstTx] Message validation failed:', error);
    return null;
  }
}
