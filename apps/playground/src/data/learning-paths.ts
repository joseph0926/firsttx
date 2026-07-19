import type { PackageType } from '@/components/demo';

export interface DemoMeta {
  id: string;
  title: string;
  path: string;
  package: PackageType;
  description: string;
  problem: string;
  solution: string;
  problemDetails?: string[];
  solutionDetails?: string[];
  codeSnippet?: string;
  codeTitle?: string;
  docsLink?: string;
  level: 1 | 2 | 3;
  difficulty: 1 | 2 | 3;
  duration: string;
  packages: PackageType[];
}

export const prepaintDemos: DemoMeta[] = [
  {
    id: 'heavy',
    title: 'Heavy Page',
    path: '/prepaint/heavy',
    package: 'prepaint',
    description: 'Compare a cold visit with a revisit that has a stored visual snapshot',
    problem:
      'A CSR revisit can go blank while the bundle loads and React mounts. The duration depends on the app and network.',
    solution:
      'Prepaint can show the last captured visual snapshot as a non-interactive overlay until React commits.',
    problemDetails: [
      'The app bundle and data still need to load',
      'Without a snapshot, the root stays empty until React commits',
      'A stored snapshot can be stale or unavailable',
    ],
    solutionDetails: [
      'Capture only allowlisted routes',
      'Restore into an overlay outside the React root',
      'Keep the restored surface non-interactive',
      'Remove the overlay after the first React commit',
    ],
    codeSnippet: `import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);`,
    codeTitle: 'Prepaint Setup',
    docsLink: 'https://firsttx-docs.vercel.app/docs/prepaint',
    level: 1,
    difficulty: 1,
    duration: '30s',
    packages: ['prepaint', 'local-first'],
  },
  {
    id: 'route-switching',
    title: 'Route Switching',
    path: '/prepaint/route-switching',
    package: 'prepaint',
    description: 'Inspect pathname-based snapshot capture and restore with React Router 7',
    problem:
      'Each pathname needs its own valid snapshot and allowlist policy. A snapshot for one route must not be restored on another.',
    solution:
      'Prepaint keys schema v2 snapshots by exact pathname and restores only routes included in the configured policy.',
    problemDetails: [
      'Route keys can drift from the router configuration',
      'Old snapshots need pruning when policy changes',
      'ViewTransition may be unavailable in the browser',
    ],
    solutionDetails: [
      'Capture exact allowlisted pathnames',
      'Keep route snapshots isolated',
      'Fall back when ViewTransition is unavailable',
    ],
    codeSnippet: `import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    react(),
    firstTx({ policy: { routes: ['/prepaint/route-switching'] } }),
  ],
});`,
    codeTitle: 'Vite Plugin Setup',
    docsLink: 'https://firsttx-docs.vercel.app/docs/prepaint',
    level: 1,
    difficulty: 2,
    duration: '1m',
    packages: ['prepaint', 'local-first'],
  },
];

export const localFirstDemos: DemoMeta[] = [
  {
    id: 'instant-cart',
    title: 'Optimistic Cart',
    path: '/sync/instant-cart',
    package: 'local-first',
    description:
      'Compare request-first updates with optimistic local paint and server acknowledgement',
    problem:
      'When the UI waits for a request to finish, interaction latency includes the simulated server delay.',
    solution:
      'This demo paints a local optimistic update first, records server acknowledgement separately, and restores the supplied snapshot when the request fails.',
    problemDetails: [
      'Click button → Server request → Wait for response → Update UI',
      'The visible delay changes with the configured request fixture',
      'Request completion and UI paint are different events',
    ],
    solutionDetails: [
      'Record input-to-paint and server acknowledgement separately',
      'Apply the optimistic callback before the request settles',
      'Run the supplied rollback callback on request failure',
    ],
    codeSnippet: `const { data: cart, patch } = useSyncedModel(CartModel, fetchCart);

await patch((draft) => {
  draft.items.push(newItem);
  draft.total += newItem.price;
});`,
    codeTitle: 'Local-First Update',
    docsLink: 'https://firsttx-docs.vercel.app/docs/local-first',
    level: 2,
    difficulty: 2,
    duration: '1m',
    packages: ['local-first', 'tx'],
  },
  {
    id: 'staleness',
    title: 'Staleness Detection',
    path: '/sync/staleness',
    package: 'local-first',
    description: 'Compare TTL expiry with always, stale, and never mount-sync strategies',
    problem: 'Cached data needs an explicit freshness policy; age alone does not refresh it.',
    solution:
      'Local-First exposes history.isStale and applies the selected syncOnMount strategy when the model mounts.',
    problemDetails: [
      'The model TTL and demo timer must agree',
      'A stale record may remain visible while revalidation runs',
      'The never strategy requires an explicit sync call',
    ],
    solutionDetails: [
      'Expose stale state through model history',
      'Choose always, stale, or never for mount sync',
      'Show the model TTL and last update time in the UI',
    ],
    codeSnippet: `const CartModel = defineModel('cart', {
  schema: CartSchema,
  ttl: 5 * 60 * 1000,
  initialData: { items: [], total: 0 },
});

const { data, isStale, sync } = useSyncedModel(CartModel, fetcher, {
  syncOnMount: 'stale',
});`,
    codeTitle: 'TTL Configuration',
    docsLink: 'https://firsttx-docs.vercel.app/docs/local-first',
    level: 2,
    difficulty: 2,
    duration: '1m',
    packages: ['local-first'],
  },
  {
    id: 'suspense',
    title: 'Suspense Integration',
    path: '/sync/suspense',
    package: 'local-first',
    description: 'Inspect first-visit, fresh-cache, and stale-cache Suspense behavior',
    problem:
      'Cache state changes whether a Suspense boundary shows fallback content or committed data.',
    solution:
      'useSuspenseSyncedModel returns fresh cached data immediately and revalidates stale cached data in the background.',
    problemDetails: [
      'An empty cache suspends until data resolves',
      'Fresh and stale cache paths have different network behavior',
      'Failures need an Error Boundary and recovery path',
    ],
    solutionDetails: [
      'Use a Suspense boundary for the empty-cache path',
      'Return fresh cached data without a fallback',
      'Return stale cached data while revalidation runs',
    ],
    codeSnippet: `<Suspense fallback={<Loading />}>
  <CartComponent />
</Suspense>

function CartComponent() {
  const { data } = useSuspenseSyncedModel(CartModel, fetcher);
  return <div>{data.total}</div>;
}`,
    codeTitle: 'Suspense Pattern',
    docsLink: 'https://firsttx-docs.vercel.app/docs/local-first',
    level: 2,
    difficulty: 2,
    duration: '1m',
    packages: ['local-first'],
  },
  {
    id: 'timing',
    title: 'Replace / Rollback Ordering',
    path: '/sync/timing',
    package: 'local-first',
    description: 'Observe server replacement before, during, and after transaction rollback',
    problem:
      'Local-First replace and Tx rollback do not share a coordinator, so their final ordering is application-owned.',
    solution:
      'This demo reproduces the current limitation instead of claiming cross-package ordering protection.',
    problemDetails: [
      'Server replacement can arrive before, during, or after rollback',
      'The packages do not select a shared winner',
      'The application must define conflict handling when it needs one',
    ],
    solutionDetails: [
      'Run fixed interleaving fixtures',
      'Record the final model snapshot for each order',
      'Treat the unsupported ordering as an expected limitation',
    ],
    codeSnippet: `const { data, patch } = useSyncedModel(CartModel, fetcher);

await patch((draft) => {
  draft.items.push(newItem);
});`,
    codeTitle: 'Replace / Rollback Fixture',
    docsLink: 'https://firsttx-docs.vercel.app/docs/local-first',
    level: 2,
    difficulty: 3,
    duration: '2m',
    packages: ['local-first', 'tx'],
  },
];

export const txDemos: DemoMeta[] = [
  {
    id: 'concurrent',
    title: 'Overlapping Hook Calls',
    path: '/tx/concurrent',
    package: 'tx',
    description: 'Inspect overlapping mutate calls from the same useTx hook',
    problem:
      'Each mutate call creates a transaction, but hook-level pending, error, success, and cancel state are shared.',
    solution:
      'The demo shows per-transaction compensation alongside the current shared hook-state limitation.',
    problemDetails: [
      'Pending and error state are not isolated per invocation',
      'Cancel control is shared by the hook instance',
      'Batch completion rate is an observed workload metric',
    ],
    solutionDetails: [
      'Create a Transaction for each mutate call',
      'Run each registered compensation on that transaction failure',
      'Do not present hook status as invocation-isolated',
    ],
    codeSnippet: `const results = await Promise.allSettled(
  items.map((item) => reserveItemTx({ itemId: item.id }))
);

const successCount = results.filter(r => r.status === 'fulfilled').length;`,
    codeTitle: 'Concurrent Transactions',
    docsLink: 'https://firsttx-docs.vercel.app/docs/tx',
    level: 3,
    difficulty: 3,
    duration: '2m',
    packages: ['tx', 'local-first'],
  },
  {
    id: 'rollback-chain',
    title: 'Rollback Chain',
    path: '/tx/rollback-chain',
    package: 'tx',
    description: 'Inspect reverse-order compensation after a later step fails',
    problem:
      'When one step fails in a multi-step operation, completed steps must be manually reverted.',
    solution:
      'Tx records a compensation for each completed step and runs those compensations in reverse order after failure.',
    problemDetails: [
      'Failure at step 4 of 5-step operation',
      'Manual rollback of steps 1-3 required',
      'Rollback order mistakes cause additional issues',
    ],
    solutionDetails: [
      'Register rollback function per step',
      'Execute completed compensations in reverse order (3→2→1)',
      'Report compensation failures instead of hiding them',
      'Measure rollback duration as a benchmark, not a guarantee',
    ],
    codeSnippet: `const tx = startTransaction();

await tx.run(
  () => decreaseStock(itemId),
  { compensate: () => increaseStock(itemId) }
);

await tx.run(
  () => processPayment(amount),
  { compensate: () => refundPayment(amount) }
);

await tx.commit();`,
    codeTitle: 'Multi-step Rollback',
    docsLink: 'https://firsttx-docs.vercel.app/docs/tx',
    level: 3,
    difficulty: 3,
    duration: '2m',
    packages: ['tx'],
  },
  {
    id: 'network-chaos',
    title: 'Retry and Backoff',
    path: '/tx/network-chaos',
    package: 'tx',
    description: 'Run seeded request failures with configurable attempts and delay',
    problem:
      'Transient and terminal request failures need a bounded retry policy and a defined rollback path.',
    solution:
      'Tx applies the configured retry schedule and runs compensation when attempts are exhausted.',
    problemDetails: [
      'Temporary network instability',
      'Manual user retry required',
      'Infinite retries risk server overload',
    ],
    solutionDetails: [
      'Retry only up to the configured attempt count',
      'Apply the configured delay and backoff policy',
      'Rollback on final failure',
      'Report the observed attempt sequence and terminal state',
    ],
    codeSnippet: `const { mutateAsync } = useTx({
  optimistic: () => {},
  rollback: () => {},
  request: () => {},
  retry: {
    maxAttempts: 3,
    delay: 500,
    backoff: 'exponential',
  },
});`,
    codeTitle: 'Retry Configuration',
    docsLink: 'https://firsttx-docs.vercel.app/docs/tx',
    level: 3,
    difficulty: 3,
    duration: '2m',
    packages: ['tx'],
  },
];

export const allDemos = {
  prepaint: prepaintDemos,
  'local-first': localFirstDemos,
  tx: txDemos,
};

export const demosList = [...prepaintDemos, ...localFirstDemos, ...txDemos];

export function getDemoById(id: string): DemoMeta | undefined {
  return demosList.find((demo) => demo.id === id);
}

export function getRelatedDemos(currentId: string, limit = 2): DemoMeta[] {
  const current = getDemoById(currentId);
  if (!current) return [];

  return demosList
    .filter((demo) => demo.id !== currentId && demo.packages.includes(current.package))
    .slice(0, limit);
}

export const learningPaths = {
  prepaint: prepaintDemos.map((demo, i) => ({ number: i + 1, ...demo })),
  'local-first': localFirstDemos.map((demo, i) => ({ number: i + 1, ...demo })),
  tx: txDemos.map((demo, i) => ({ number: i + 1, ...demo })),
};
