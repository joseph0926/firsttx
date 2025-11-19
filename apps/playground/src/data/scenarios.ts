export type ScenarioType = 'observe' | 'interact' | 'experiment';

export type PackageName = 'prepaint' | 'local-first' | 'tx';

export type MetricFormat = 'ms' | 'percentage' | 'count' | 'number' | 'boolean';

export interface ScenarioMetric {
  label: string;
  value: string;
  target?: string;
  description: string;
  metricKey?: string;
  format?: MetricFormat;
}

export interface ScenarioMeta {
  id: string;
  title: string;
  description: string;
  path: string;
  type: ScenarioType;
  difficulty: 1 | 2 | 3;
  duration: string;
  packages: PackageName[];
  metrics: ScenarioMetric[];
}

export interface LevelData {
  level: number;
  title: string;
  description: string;
  scenarios: ScenarioMeta[];
}

export const scenarioTypeConfig: Record<ScenarioType, { label: string; className: string }> = {
  observe: {
    label: 'Observe',
    className: 'bg-blue-500/20 text-blue-400',
  },
  interact: {
    label: 'Interact',
    className: 'bg-green-500/20 text-green-400',
  },
  experiment: {
    label: 'Experiment',
    className: 'bg-purple-500/20 text-purple-400',
  },
};

export const levels: LevelData[] = [
  {
    level: 1,
    title: 'Prepaint Mastery',
    description: 'Eliminate blank screen time on revisits',
    scenarios: [
      {
        id: 'heavy',
        title: 'Heavy Page',
        description: 'Experience 0ms blank screen with 100+ product grids',
        path: '/prepaint/heavy',
        type: 'observe',
        difficulty: 1,
        duration: '30s',
        packages: ['prepaint', 'local-first'],
        metrics: [
          {
            label: 'Blank Screen Time',
            value: '~12ms',
            target: '<20ms',
            description: 'Time user sees white screen. Above 50ms causes noticeable flash.',
            metricKey: 'warmFirstContentfulPaint',
            format: 'ms',
          },
          {
            label: 'DOM Reuse',
            value: '>90%',
            target: '>90%',
            description: 'Snapshot reuse rate. Higher means faster hydration.',
          },
        ],
      },
      {
        id: 'route-switching',
        title: 'Route Switching',
        description: 'See prepaint integration with React Router 7',
        path: '/prepaint/route-switching',
        type: 'interact',
        difficulty: 2,
        duration: '1m',
        packages: ['prepaint', 'local-first'],
        metrics: [
          {
            label: 'Routes Covered',
            value: '5',
            description: 'Number of routes with snapshot support.',
          },
          {
            label: 'Transitions',
            value: 'Smooth',
            description: 'ViewTransition API integration for seamless navigation.',
          },
        ],
      },
    ],
  },
  {
    level: 2,
    title: 'Sync Battles',
    description: 'Handle local and server data conflicts',
    scenarios: [
      {
        id: 'instant-cart',
        title: 'Instant Cart',
        description: 'Traditional CSR vs Local-First response time comparison',
        path: '/sync/instant-cart',
        type: 'interact',
        difficulty: 2,
        duration: '1m',
        packages: ['local-first', 'tx'],
        metrics: [
          {
            label: 'Response Time',
            value: '0ms',
            target: '0ms',
            description:
              'UI responds instantly via optimistic update. Server sync happens in background.',
            metricKey: 'firstTxActionLatency',
            format: 'ms',
          },
          {
            label: 'Time Saved',
            value: '~1,300ms',
            description: 'Cumulative time saved per interaction vs traditional CSR.',
            metricKey: 'timeSavedPerInteraction',
            format: 'ms',
          },
        ],
      },
      {
        id: 'timing',
        title: 'Timing Attack',
        description: 'Server sync during transaction execution',
        path: '/sync/timing',
        type: 'experiment',
        difficulty: 3,
        duration: '2m',
        packages: ['local-first', 'tx'],
        metrics: [
          {
            label: 'Race Protection',
            value: 'Active',
            description: 'Prevents race conditions between local updates and server sync.',
          },
          {
            label: 'Consistency',
            value: '100%',
            description: 'Data consistency guarantee even under concurrent operations.',
          },
        ],
      },
      {
        id: 'staleness',
        title: 'Staleness Detection',
        description: 'TTL expiry and stale data handling',
        path: '/sync/staleness',
        type: 'interact',
        difficulty: 2,
        duration: '1m',
        packages: ['local-first'],
        metrics: [
          {
            label: 'TTL',
            value: '5min',
            description: 'Time-to-live before data is considered stale.',
          },
          {
            label: 'Detection',
            value: 'Automatic',
            description: 'Automatically detects and refreshes stale data.',
          },
        ],
      },
      {
        id: 'suspense',
        title: 'Suspense Integration',
        description: 'React 19+ Suspense with useSuspenseSyncedModel',
        path: '/sync/suspense',
        type: 'interact',
        difficulty: 2,
        duration: '1m',
        packages: ['local-first'],
        metrics: [
          {
            label: 'Pattern',
            value: 'Declarative',
            description: 'No null checks needed - data is always available.',
          },
          {
            label: 'Loading',
            value: 'Suspense',
            description: 'Uses React Suspense boundaries for loading states.',
          },
        ],
      },
    ],
  },
  {
    level: 3,
    title: 'Tx Mastery',
    description: 'Guarantee atomic all-or-nothing updates',
    scenarios: [
      {
        id: 'concurrent',
        title: 'Concurrent Updates',
        description: 'Multiple transactions execute simultaneously',
        path: '/tx/concurrent',
        type: 'experiment',
        difficulty: 3,
        duration: '2m',
        packages: ['tx', 'local-first'],
        metrics: [
          {
            label: 'Throughput',
            value: '10 tx/s',
            description: 'Concurrent transaction processing rate.',
            metricKey: 'successRate',
            format: 'percentage',
          },
          {
            label: 'Consistency',
            value: 'Guaranteed',
            description: 'All-or-nothing guarantee for each transaction.',
            metricKey: 'dataConsistent',
            format: 'boolean',
          },
        ],
      },
      {
        id: 'rollback-chain',
        title: 'Rollback Chain',
        description: 'Multi-step transaction rollback in reverse',
        path: '/tx/rollback-chain',
        type: 'experiment',
        difficulty: 3,
        duration: '2m',
        packages: ['tx'],
        metrics: [
          {
            label: 'Steps',
            value: '5',
            description: 'Number of sequential steps in the transaction.',
          },
          {
            label: 'Rollback Time',
            value: '<100ms',
            description: 'Time to rollback all steps on failure.',
          },
        ],
      },
      {
        id: 'network-chaos',
        title: 'Network Chaos',
        description: 'Test retry logic under unstable conditions',
        path: '/tx/network-chaos',
        type: 'experiment',
        difficulty: 3,
        duration: '2m',
        packages: ['tx'],
        metrics: [
          {
            label: 'Retry Strategy',
            value: 'Exponential',
            description: 'Exponential backoff with configurable attempts.',
          },
          {
            label: 'Success Rate',
            value: '>90%',
            description: 'Expected success rate under chaotic conditions.',
          },
        ],
      },
    ],
  },
];
