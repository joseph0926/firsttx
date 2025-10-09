export type HandoffStrategy = 'has-prepaint' | 'cold-start';

/**
 * Check if prepaint snapshot exists
 * @returns 'has-prepaint' if snapshot exists, 'cold-start' otherwise
 */
export function handoff(): HandoffStrategy {
  const hasPrepaint = document.documentElement.hasAttribute('data-prepaint');

  if (hasPrepaint && process.env.NODE_ENV === 'development') {
    const timestamp = document.documentElement.getAttribute('data-prepaint-timestamp');
    const age = timestamp ? Date.now() - parseInt(timestamp, 10) : 0;
    console.log(`[FirstTx] Prepaint detected (age: ${age}ms)`);
  }

  return hasPrepaint ? 'has-prepaint' : 'cold-start';
}
