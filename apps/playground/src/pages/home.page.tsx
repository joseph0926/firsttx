import { Link } from 'react-router';
import { IntroSection } from '@/components/home/intro-section';
import { LevelSection } from '@/components/home/level-section';
import { StatCard } from '@/components/home/stat-card';
import { DevtoolsPanel } from '@/components/home/devtools-panel';
import { levels } from '@/data/scenarios';
import { BookOpen, GitBranch, RefreshCw, Terminal, Zap } from 'lucide-react';
import { useModel } from '@firsttx/local-first';
import { PlaygroundMetricsModel, type PlaygroundMetrics } from '@/models/metrics.model';
import type { MetricFormat } from '@/data/scenarios';

function formatValue(value: unknown, format: MetricFormat): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'ms':
        return `${value.toFixed(1)}ms`;
      case 'count':
        return value.toFixed(0);
      case 'boolean':
        return value ? '✓' : '✗';
      default:
        return value.toFixed(1);
    }
  }
  if (typeof value === 'boolean') {
    return value ? '✓' : '✗';
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

export default function HomePage() {
  const [metrics] = useModel(PlaygroundMetricsModel);
  const scenarioMetrics = metrics?.scenarios ?? {};
  const liveBenchmarks = [
    {
      label: 'Prepaint Warm FCP',
      description: 'Blank screen on revisit (ms)',
      metric: formatValue(
        scenarioMetrics['prepaint-heavy']?.metrics['warmFirstContentfulPaint'],
        'ms',
      ),
      target: '<20ms',
    },
    {
      label: 'Instant Cart Time Saved',
      description: 'Per interaction (ms)',
      metric: formatValue(
        scenarioMetrics['instant-cart']?.metrics['timeSavedPerInteraction'],
        'ms',
      ),
      target: 'Higher is better',
    },
    {
      label: 'Concurrent Success Rate',
      description: 'Tx completion',
      metric: formatValue(scenarioMetrics['tx-concurrent']?.metrics['successRate'], 'percentage'),
      target: '>90%',
    },
  ];

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
          <p className="mb-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Experience how FirstTx solves CSR challenges through 10 real-world scenarios. Test
            instant replay, atomic rollback, and server sync in action.
          </p>
          <div className="mb-8">
            <Link
              to="/getting-started"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <BookOpen className="h-4 w-4" />
              Getting Started Guide
            </Link>
          </div>
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
              value="4 scenarios"
              description="Server reconciliation"
            />
            <StatCard
              icon={<GitBranch className="h-5 w-5" />}
              label="Tx"
              value="3 scenarios"
              description="Atomic updates"
            />
          </div>
          <IntroSection />
          <DevtoolsPanel scenarioMetrics={scenarioMetrics as PlaygroundMetrics['scenarios']} />
          <div className="grid gap-4 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-3">
            {liveBenchmarks.map((entry) => (
              <div
                key={entry.label}
                className="rounded-lg border border-border bg-background/70 p-4 shadow-sm"
                aria-live="polite"
              >
                <div className="text-xs uppercase text-muted-foreground tracking-wide">
                  {entry.label}
                </div>
                <div className="text-3xl font-bold">{entry.metric ?? '--'}</div>
                <div className="text-xs text-muted-foreground">{entry.description}</div>
                {entry.target && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Target: {entry.target}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {levels.map((level) => (
            <LevelSection
              key={level.level}
              level={level.level}
              title={level.title}
              description={level.description}
              scenarios={level.scenarios}
              metrics={scenarioMetrics as PlaygroundMetrics['scenarios']}
            />
          ))}
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
