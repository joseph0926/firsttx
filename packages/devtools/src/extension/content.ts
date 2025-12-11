import {
  isBridgeMessage,
  isBackgroundToContentMessage,
  EXTENSION_MESSAGE_SOURCE,
  type ContentToBackgroundMessage,
  type ExtensionToBridgeMessage,
  type BackgroundResponse,
} from './types';

console.log('[FirstTx] Content script loaded');

function getCurrentOrigin(): string {
  try {
    const { location } = window;
    if (location?.origin && location.origin !== 'null') {
      return location.origin;
    }
  } catch {
    // Security error
  }
  return '*';
}

type RuntimeLike = {
  getURL(path: string): string;
  sendMessage(
    message: ContentToBackgroundMessage,
    responseCallback: (response: BackgroundResponse) => void,
  ): void;
  onMessage: {
    addListener(
      listener: (
        message: unknown,
        sender: unknown,
        sendResponse: (response: unknown) => void,
      ) => void,
    ): void;
  };
  lastError?: { message?: string };
};

const runtime = (
  globalThis as typeof globalThis & {
    chrome?: { runtime?: RuntimeLike };
  }
).chrome?.runtime;

if (!runtime) {
  console.warn('[FirstTx Content] chrome.runtime API not available. Skipping initialization.');
} else {
  const script = document.createElement('script');
  script.src = runtime.getURL('bridge.js');
  script.onload = () => {
    console.log('[FirstTx] Bridge injected');
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;

    if (!isBridgeMessage(event.data)) return;

    const bridgeMessage = event.data;

    const message: ContentToBackgroundMessage = {
      type: 'bridge-event',
      data: bridgeMessage,
      timestamp: Date.now(),
    };

    runtime.sendMessage(message, (response: BackgroundResponse) => {
      if (runtime.lastError) {
        console.warn('[FirstTx Content] Background not responding:', runtime.lastError.message);
        return;
      }

      if (!response.success) {
        console.error('[FirstTx Content] Background rejected message:', response.error);
        return;
      }

      if (response.forwarded) {
        console.debug('[FirstTx Content] Event forwarded to DevTools');
      }
    });
  });

  runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isBackgroundToContentMessage(message)) {
      sendResponse({ success: false, error: 'Invalid message type' });
      return false;
    }

    try {
      const toBridge: ExtensionToBridgeMessage = {
        source: EXTENSION_MESSAGE_SOURCE,
        type: 'command',
        data: message.data,
      };

      window.postMessage(toBridge, getCurrentOrigin());

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return true;
  });

  console.log('[FirstTx] Content script ready');
}
