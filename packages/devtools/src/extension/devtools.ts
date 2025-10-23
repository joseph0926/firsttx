console.log('[FirstTx] DevTools page loaded');

chrome.devtools.panels.create('FirstTx', '', 'panel/index.html', () => {
  console.log('[FirstTx] Panel created');
});
