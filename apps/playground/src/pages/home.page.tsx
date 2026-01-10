import { Link, Navigate } from 'react-router';
import { IntroSection } from '@/components/home/intro-section';
import { LevelSection } from '@/components/home/level-section';
import { StatCard } from '@/components/home/stat-card';
import { DevtoolsPanel } from '@/components/home/devtools-panel';
import { LanguageSwitcher } from '@/components/language-switcher';
import { levels } from '@/data/scenarios';
import { BookOpen, GitBranch, Play, RefreshCw, Terminal, Zap } from 'lucide-react';
import { useModel } from '@firsttx/local-first';
import { PlaygroundMetricsModel, type PlaygroundMetrics } from '@/models/metrics.model';
import { TourModel } from '@/models/tour.model';
import { useI18n } from '@/hooks/use-i18n';
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

function HomePageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, getDocsUrl } = useI18n();
  const { data: metrics } = useModel(PlaygroundMetricsModel);
  const { data: tourState, status: tourStatus } = useModel(TourModel);

  if (tourStatus === 'loading') {
    return <HomePageSkeleton />;
  }

  if (tourState?.status === 'not_started') {
    return <Navigate to="/tour/problem" replace />;
  }

  const scenarioMetrics = metrics?.scenarios ?? {};
  const liveBenchmarks = [
    {
      label: t('home.prepaintWarmFcp'),
      description: t('home.prepaintWarmFcpDescription'),
      metric: formatValue(
        scenarioMetrics['prepaint-heavy']?.metrics['warmFirstContentfulPaint'],
        'ms',
      ),
      target: '<20ms',
    },
    {
      label: t('home.instantCartTimeSaved'),
      description: t('home.instantCartTimeSavedDescription'),
      metric: formatValue(
        scenarioMetrics['instant-cart']?.metrics['timeSavedPerInteraction'],
        'ms',
      ),
      target: t('home.higherIsBetter'),
    },
    {
      label: t('home.concurrentSuccessRate'),
      description: t('home.txCompletion'),
      metric: formatValue(scenarioMetrics['tx-concurrent']?.metrics['successRate'], 'percentage'),
      target: '>90%',
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative px-6 py-24 md:py-32">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground terminal-text">
            <Terminal className="h-4 w-4" />
            <span>$ firsttx --playground</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            {t('home.tagline')}
          </h1>
          <p className="mb-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            {t('home.description')}
          </p>
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <Link
              to="/tour"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Play className="h-4 w-4" />
              {t('home.fiveMinTour')}
            </Link>
            <a
              href={getDocsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium transition-colors hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              {t('common.documentation')}
            </a>
          </div>
          <div className="mb-12 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Zap className="h-5 w-5" />}
              label={t('home.prepaint')}
              value={`2 ${t('home.scenarios')}`}
              description={t('home.prepaintDescription')}
            />
            <StatCard
              icon={<RefreshCw className="h-5 w-5" />}
              label={t('home.sync')}
              value={`4 ${t('home.scenarios')}`}
              description={t('home.syncDescription')}
            />
            <StatCard
              icon={<GitBranch className="h-5 w-5" />}
              label={t('home.tx')}
              value={`3 ${t('home.scenarios')}`}
              description={t('home.txDescription')}
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
              <h3 className="mb-2 text-sm font-semibold">{t('common.aboutFirstTx')}</h3>
              <p className="text-sm text-muted-foreground">{t('common.aboutFirstTxDescription')}</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('common.resources')}</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <a
                    href={getDocsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {t('common.documentation')}
                  </a>
                </li>
                <li>
                  <a
                    href={getDocsUrl('prepaint')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {t('common.prepaintPackage')}
                  </a>
                </li>
                <li>
                  <a
                    href={getDocsUrl('local-first')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {t('common.localFirstPackage')}
                  </a>
                </li>
                <li>
                  <a
                    href={getDocsUrl('tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {t('common.txPackage')}
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
