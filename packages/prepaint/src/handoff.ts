declare const __FIRSTTX_DEV__: boolean;

export type HandoffStrategy = 'has-prepaint' | 'cold-start';

export function handoff(): HandoffStrategy {
  const hasPrepaint = document.documentElement.hasAttribute('data-prepaint');
  if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__ && hasPrepaint) {
    const timestamp = document.documentElement.getAttribute('data-prepaint-timestamp');
    const age = timestamp ? Date.now() - parseInt(timestamp, 10) : 0;
    console.log(`[FirstTx] Prepaint detected (age: ${age}ms)`);
  }
  return hasPrepaint ? 'has-prepaint' : 'cold-start';
}
