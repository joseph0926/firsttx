import type { DevToolsEvent } from '../bridge/types';
import type { BackgroundToDevToolsMessage, BackgroundResponse } from './types';
import { isContentToBackgroundMessage, isDevToolsToBackgroundMessage } from './types';

const devToolsPorts = new Map<number, chrome.runtime.Port>();
const portToTabId = new Map<chrome.runtime.Port, number>();
const eventBuffers = new Map<number, DevToolsEvent[]>();

console.log('[FirstTx Background] Service worker started');

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'devtools-panel') return;

  console.log('[FirstTx Background] DevTools panel connecting...');

  port.onMessage.addListener((msg) => {
    if (!isDevToolsToBackgroundMessage(msg)) {
      console.warn('[FirstTx Background] Invalid DevTools message:', msg);
      return;
    }

    switch (msg.type) {
      case 'init': {
        if (typeof msg.tabId !== 'number') {
          console.error('[FirstTx Background] Init without valid tabId:', msg);
          return;
        }

        const tabId = msg.tabId;

        devToolsPorts.set(tabId, port);
        portToTabId.set(port, tabId);

        console.log(`[FirstTx Background] DevTools connected for tab ${tabId}`);

        const buffered = eventBuffers.get(tabId);
        if (buffered && buffered.length > 0) {
          const message: BackgroundToDevToolsMessage = {
            type: 'events',
            events: buffered,
          };
          port.postMessage(message);
          eventBuffers.delete(tabId);
          console.log(
            `[FirstTx Background] Sent ${buffered.length} buffered events to tab ${tabId}`,
          );
        }

        const statusMessage: BackgroundToDevToolsMessage = {
          type: 'connection-status',
          connected: true,
        };
        port.postMessage(statusMessage);
        break;
      }

      case 'command': {
        console.log('[FirstTx Background] Command received:', msg.command);
        break;
      }

      case 'disconnect': {
        const tabId = portToTabId.get(port);
        if (tabId !== undefined) {
          console.log(`[FirstTx Background] DevTools explicit disconnect for tab ${tabId}`);
        }
        break;
      }
    }
  });

  port.onDisconnect.addListener(() => {
    const tabId = portToTabId.get(port);
    if (tabId !== undefined) {
      devToolsPorts.delete(tabId);
      portToTabId.delete(port);
      console.log(`[FirstTx Background] DevTools disconnected for tab ${tabId}`);
    }
  });
});

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundResponse) => void,
  ) => {
    if (!isContentToBackgroundMessage(message)) {
      sendResponse({ success: false, error: 'Invalid message type' });
      return false;
    }

    if (message.type !== 'bridge-event') {
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
    }

    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      sendResponse({ success: false, error: 'No tab ID' });
      return false;
    }

    const bridgeMessage = message.data;
    const events: DevToolsEvent[] = [];

    switch (bridgeMessage.type) {
      case 'event':
        if (bridgeMessage.event) {
          events.push(bridgeMessage.event);
        }
        break;

      case 'batch':
      case 'buffer-dump':
        if (bridgeMessage.events && Array.isArray(bridgeMessage.events)) {
          events.push(...bridgeMessage.events);
        }
        break;

      case 'pong':
      case 'command-response':
        sendResponse({ success: true, forwarded: false });
        return false;

      default:
        console.warn('[FirstTx Background] Unknown bridge message type:', bridgeMessage.type);
        sendResponse({ success: true, forwarded: false });
        return false;
    }

    if (events.length === 0) {
      sendResponse({ success: true, forwarded: false });
      return false;
    }

    const port = devToolsPorts.get(tabId);

    if (port) {
      try {
        const toDevTools: BackgroundToDevToolsMessage = {
          type: 'events',
          events,
        };
        port.postMessage(toDevTools);
        sendResponse({ success: true, forwarded: true });
      } catch (error) {
        console.error('[FirstTx Background] Failed to send to DevTools:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      if (!eventBuffers.has(tabId)) {
        eventBuffers.set(tabId, []);
      }

      const buffer = eventBuffers.get(tabId)!;
      buffer.push(...events);

      const MAX_BUFFER_SIZE = 500;
      if (buffer.length > MAX_BUFFER_SIZE) {
        buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
        console.warn(
          `[FirstTx Background] Buffer overflow for tab ${tabId}, trimmed to ${MAX_BUFFER_SIZE}`,
        );
      }

      sendResponse({ success: true, forwarded: false });
    }

    return false;
  },
);

console.log('[FirstTx Background] Message listeners registered');
