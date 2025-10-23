console.log('[FirstTx] Content script loaded');

const script = document.createElement('script');
script.src = chrome.runtime.getURL('bridge.js');
script.onload = () => {
  console.log('[FirstTx] Bridge injected');
  script.remove();
};
(document.head || document.documentElement).appendChild(script);
