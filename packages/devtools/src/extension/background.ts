console.log('[FirstTx] Background service worker loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[FirstTx] Message received:', message);
  sendResponse({ received: true });
});
