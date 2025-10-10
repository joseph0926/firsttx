import { LevelSection } from '@/components/home/level-section';
import { StatCard } from '@/components/home/stat-card';
import { GitBranch, RefreshCw, Terminal, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground terminal-text">
            <Terminal className="h-4 w-4" />
            <span>$ firsttx --playground</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            FirstTx Performance Arena
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Experience how FirstTx solves CSR challenges through 9 real-world scenarios. Test
            instant replay, atomic rollback, and server sync in action.
          </p>
          <div className="mb-12 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Zap className="h-5 w-5" />}
              label="Prepaint"
              value="2 scenarios"
              description="Instant replay"
            />
            <StatCard
              icon={<RefreshCw className="h-5 w-5" />}
              label="Sync"
              value="3 scenarios"
              description="Server reconciliation"
            />
            <StatCard
              icon={<GitBranch className="h-5 w-5" />}
              label="Tx"
              value="3 scenarios"
              description="Atomic updates"
            />
          </div>
        </div>
      </section>
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <LevelSection
            level={1}
            title="Prepaint Mastery"
            description="Eliminate blank screen time on revisits"
            scenarios={[
              {
                id: 'heavy',
                title: 'Heavy Page',
                description: 'Experience 0ms blank screen with 100+ product grids',
                path: '/prepaint/heavy',
                metrics: { bst: '12ms', target: '<20ms' },
              },
              {
                id: 'route-switching',
                title: 'Route Switching',
                description: 'See prepaint integration with React Router 7',
                path: '/prepaint/route-switching',
                metrics: { coverage: '5 routes', transitions: 'smooth' },
              },
            ]}
          />
          <LevelSection
            level={2}
            title="Sync Battles"
            description="Handle local and server data conflicts"
            scenarios={[
              {
                id: 'conflict',
                title: 'Conflict Resolution',
                description: 'Watch local modifications resolve against server data',
                path: '/sync/conflict',
                metrics: { strategy: 'server-first', time: '<100ms' },
              },
              {
                id: 'timing',
                title: 'Timing Attack',
                description: 'Server sync during transaction execution',
                path: '/sync/timing',
                metrics: { race: 'protected', consistency: '100%' },
              },
              {
                id: 'staleness',
                title: 'Staleness Detection',
                description: 'TTL expiry and stale data handling',
                path: '/sync/staleness',
                metrics: { ttl: '7 days', detection: 'automatic' },
              },
            ]}
          />
          <LevelSection
            level={3}
            title="Tx Mastery"
            description="Guarantee atomic all-or-nothing updates"
            scenarios={[
              {
                id: 'concurrent',
                title: 'Concurrent Updates',
                description: 'Multiple transactions execute simultaneously',
                path: '/tx/concurrent',
                metrics: { rate: '10 tx/s', consistency: 'guaranteed' },
              },
              {
                id: 'rollback-chain',
                title: 'Rollback Chain',
                description: 'Multi-step transaction rollback in reverse',
                path: '/tx/rollback-chain',
                metrics: { steps: '5', time: '<100ms' },
              },
              {
                id: 'network-chaos',
                title: 'Network Chaos',
                description: 'Test retry logic under unstable conditions',
                path: '/tx/network-chaos',
                metrics: { retry: '1x default', success: '90%+' },
              },
            ]}
          />
        </div>
      </section>
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">About FirstTx</h3>
              <p className="text-sm text-muted-foreground">
                A unified system that makes CSR revisit experiences feel like SSR. Combines
                Prepaint, Local-First, and Tx layers.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Resources</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://github.com/joseph0926/firsttx"
                    className="hover:text-foreground transition-colors"
                  >
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/joseph0926/firsttx/tree/main/packages/prepaint"
                    className="hover:text-foreground transition-colors"
                  >
                    Prepaint Package
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/joseph0926/firsttx/tree/main/packages/local-first"
                    className="hover:text-foreground transition-colors"
                  >
                    Local-First Package
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/joseph0926/firsttx/tree/main/packages/tx"
                    className="hover:text-foreground transition-colors"
                  >
                    Tx Package
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
