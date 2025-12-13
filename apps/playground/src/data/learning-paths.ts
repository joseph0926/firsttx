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
    description: 'Experience 0ms blank screen with 100+ product grids',
    problem:
      'On revisit, CSR apps show a blank screen for 2-5 seconds while loading JS bundles, degrading user experience.',
    solution:
      'Prepaint saves DOM snapshots to IndexedDB on visit and instantly restores them before JS loads on revisit, achieving ~0ms loading.',
    problemDetails: [
      'Waiting for JS bundle download (~500KB+)',
      'Waiting for React hydration',
      'Waiting for API data loading',
      'User sees blank screen for 2-5 seconds',
    ],
    solutionDetails: [
      'Boot script runs first (~1.7KB, ~15ms)',
      'Instant snapshot restore from IndexedDB',
      'React hydration in background',
      'Smooth transition to new data',
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
    description: 'See prepaint integration with React Router 7',
    problem:
      'In SPAs, route transitions cause the previous page to disappear and a flash occurs until the new page renders.',
    solution:
      'Prepaint saves snapshots per route and integrates with ViewTransition API for smooth transitions.',
    problemDetails: [
      'Component unmounts on route change',
      'Waiting for new route data',
      'Screen flickering occurs',
    ],
    solutionDetails: [
      'Auto-capture snapshots per route',
      'Maintain previous snapshot during transition',
      'Smooth animation with ViewTransition',
    ],
    codeSnippet: `import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [react(), firstTx()],
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
    title: 'Instant Cart',
    path: '/sync/instant-cart',
    package: 'local-first',
    description: 'Traditional CSR vs Local-First response time comparison',
    problem:
      'Traditional CSR requires all user actions to wait for server responses, causing ~1,300ms delays.',
    solution:
      'Local-First maintains a local cache in IndexedDB, reflects UI instantly with optimistic updates, then syncs with server in background.',
    problemDetails: [
      'Click button → Server request → Wait for response → Update UI',
      'User waits as long as network latency',
      'Completely non-functional when offline',
    ],
    solutionDetails: [
      'Click button → Instant UI update (0ms)',
      'Server sync in background',
      'Works offline with local data',
      'Auto rollback on server failure',
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
    description: 'TTL expiry and stale data handling',
    problem: 'Stale cached data can show incorrect information to users.',
    solution:
      'TTL (Time-To-Live) based freshness tracking with automatic server refresh on expiry.',
    problemDetails: [
      'Unclear cache data validity period',
      'Wrong decisions based on outdated data',
      'Manual refresh required',
    ],
    solutionDetails: [
      'Auto expiry management with TTL settings',
      'Automatic stale state detection',
      'Background auto-refresh',
      'Freshness state display in UI',
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
    description: 'Suspense with useSuspenseSyncedModel',
    problem:
      'Handling loading states requires repeating if (!data) return <Loading /> pattern everywhere.',
    solution:
      'useSuspenseSyncedModel integrates with React Suspense for declarative loading state handling.',
    problemDetails: [
      'Loading checks repeated in every component',
      'Null check logic scattered',
      'Difficult to maintain loading UI consistency',
    ],
    solutionDetails: [
      'Delegate loading handling to Suspense boundary',
      'Component assumes data is always present',
      'Type safety (data is never null)',
      'Declarative and clean code',
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
    title: 'Timing Attack',
    path: '/sync/timing',
    package: 'local-first',
    description: 'Server sync during transaction execution',
    problem:
      'Race conditions can cause data inconsistency when server sync occurs during transaction execution.',
    solution:
      'Local-First guarantees ordering between transactions and sync, maintaining 100% data consistency.',
    problemDetails: [
      'Server sync arrives during optimistic update',
      'Unclear which data is latest',
      'Partial updates can corrupt data',
    ],
    solutionDetails: [
      'Sync waits during transaction progress',
      'Sequential sync processing after completion',
      'Merge strategy on conflict',
      '100% data consistency guarantee',
    ],
    codeSnippet: `const { data, patch } = useSyncedModel(CartModel, fetcher);

await patch((draft) => {
  draft.items.push(newItem);
});`,
    codeTitle: 'Race Condition Prevention',
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
    title: 'Concurrent Updates',
    path: '/tx/concurrent',
    package: 'tx',
    description: 'Multiple transactions execute simultaneously',
    problem:
      'When multiple users modify the same resource simultaneously, conflicts occur and partial success leads to data inconsistency.',
    solution:
      'Tx processes each transaction atomically and auto-rollbacks on failure to ensure data consistency.',
    problemDetails: [
      'Concurrent updates cause overwrites',
      'Partial failures lead to inconsistent state',
      'Manual rollback logic required',
    ],
    solutionDetails: [
      'Each transaction processed independently',
      'Auto rollback on failure (all-or-nothing)',
      'Only successful transactions applied',
      '100% data consistency guarantee',
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
    description: 'Multi-step transaction rollback in reverse',
    problem:
      'When one step fails in a multi-step operation, completed steps must be manually reverted.',
    solution:
      'Tx registers compensation functions for each step and auto-rollbacks in reverse order on failure.',
    problemDetails: [
      'Failure at step 4 of 5-step operation',
      'Manual rollback of steps 1-3 required',
      'Rollback order mistakes cause additional issues',
    ],
    solutionDetails: [
      'Register rollback function per step',
      'Auto execute in reverse on failure (3→2→1)',
      'Safe handling of rollback errors',
      'Complete rollback in <100ms',
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
    title: 'Network Chaos',
    path: '/tx/network-chaos',
    package: 'tx',
    description: 'Test retry logic under unstable conditions',
    problem: 'When requests fail in unstable network conditions, users must manually retry.',
    solution:
      'Tx has built-in exponential backoff retry logic to automatically recover from transient failures.',
    problemDetails: [
      'Temporary network instability',
      'Manual user retry required',
      'Infinite retries risk server overload',
    ],
    solutionDetails: [
      'Auto retry up to configured attempts',
      'Exponential backoff prevents server overload',
      'Rollback on final failure',
      '>90% success rate achieved',
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
