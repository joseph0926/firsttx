import {
  isBridgeMessage,
  isBackgroundToContentMessage,
  EXTENSION_MESSAGE_SOURCE,
  type ContentToBackgroundMessage,
  type ExtensionToBridgeMessage,
  type BackgroundResponse,
} from './types';

console.log('[FirstTx] Content script loaded');

const script = document.createElement('script');
script.src = chrome.runtime.getURL('bridge.js');
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

  chrome.runtime.sendMessage(message, (response: BackgroundResponse) => {
    if (chrome.runtime.lastError) {
      console.warn(
        '[FirstTx Content] Background not responding:',
        chrome.runtime.lastError.message,
      );
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

    window.postMessage(toBridge, '*');

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
