import { useState, useEffect } from 'react';
import { Clock, AlertCircle, RefreshCw, CheckCircle2, Zap } from 'lucide-react';
import { DemoLayout, MetricsGrid, MetricCard, SectionHeader } from '@/components/demo';
import { useSyncedModel } from '@firsttx/local-first';
import { AutoStatsModel, ManualStatsModel } from '@/models/dashboard-stats.model';
import { fetchDashboardStats } from '@/api/dashboard-stats.api';
import { getDemoById, getRelatedDemos } from '@/data/learning-paths';

const demoMeta = getDemoById('staleness')!;
const relatedDemos = getRelatedDemos('staleness', 2);

export default function StalenessDetection() {
  const {
    data: autoStats,
    isSyncing: isAutoSyncing,
    history: autoHistory,
  } = useSyncedModel(AutoStatsModel, fetchDashboardStats);

  const {
    data: manualStats,
    sync: manualSync,
    isSyncing: isManualSyncing,
    error: manualError,
    history: manualHistory,
  } = useSyncedModel(ManualStatsModel, fetchDashboardStats, {
    syncOnMount: 'never',
  });

  const [currentAge, setCurrentAge] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentAge(Date.now() - manualHistory.updatedAt);
    }, 1000);
    return () => clearInterval(timerId);
  }, [manualHistory.updatedAt]);

  return (
    <DemoLayout
      level={demoMeta.level}
      title={demoMeta.title}
      packages={demoMeta.packages}
      difficulty={demoMeta.difficulty}
      duration={demoMeta.duration}
      problem={demoMeta.problem}
      solution={demoMeta.solution}
      problemDetails={demoMeta.problemDetails}
      solutionDetails={demoMeta.solutionDetails}
      codeSnippet={demoMeta.codeSnippet}
      codeTitle={demoMeta.codeTitle}
      docsLink={demoMeta.docsLink}
      relatedDemos={relatedDemos}
    >
      <MetricsGrid>
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Data Age"
          value={`${Math.floor(currentAge / 1000)}s`}
          target="<30s fresh"
          status={currentAge < 30000 ? 'excellent' : 'poor'}
        />
        <MetricCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Manual Zone Status"
          value={manualHistory.isStale ? 'Stale' : 'Fresh'}
          target="Within TTL"
          status={manualHistory.isStale ? 'poor' : 'excellent'}
        />
        <MetricCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Auto Zone Status"
          value={isAutoSyncing ? 'Syncing...' : 'Idle'}
          target="Auto-refresh on stale"
          status="good"
        />
      </MetricsGrid>

      <SectionHeader
        title="TTL & Staleness Simulator"
        description="Test syncOnMount strategies - 'stale' auto-refreshes, 'never' requires manual trigger."
      />

      <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Zap className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm">
            <div className="font-medium text-blue-400">Try This</div>
            <div className="text-muted-foreground">
              Manual Zone data shows as Stale after 30 seconds. Auto Zone refreshes automatically,
              but Manual Zone requires clicking the Refresh button.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-green-500/30 bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Auto-Sync Zone (syncOnMount: 'stale')
          </h3>
          {autoStats ? (
            <div className="grid gap-4 md:grid-cols-2">
              <StatDisplay label="Revenue" value={`$${autoStats.revenue.toLocaleString()}`} />
              <StatDisplay label="Active Users" value={autoStats.activeUsers.toString()} />
              <StatDisplay label="Orders" value={autoStats.orders.toString()} />
              <StatDisplay label="Conversion" value={`${autoStats.conversionRate.toFixed(2)}%`} />
            </div>
          ) : (
            <div className="text-muted-foreground">Loading...</div>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm">
            {isAutoSyncing && <RefreshCw className="h-4 w-4 animate-spin" />}
            {autoHistory.isStale ? (
              <span className="text-yellow-500">Stale - Auto-refreshing...</span>
            ) : (
              <span className="text-green-500">Fresh</span>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Strategy: Syncs on mount when data exceeds TTL
          </div>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <RefreshCw className="h-5 w-5 text-yellow-500" />
            Manual-Sync Zone (syncOnMount: 'never')
          </h3>
          {manualStats ? (
            <div className="grid gap-4 md:grid-cols-2">
              <StatDisplay label="Revenue" value={`$${manualStats.revenue.toLocaleString()}`} />
              <StatDisplay label="Active Users" value={manualStats.activeUsers.toString()} />
              <StatDisplay label="Orders" value={manualStats.orders.toString()} />
              <StatDisplay label="Conversion" value={`${manualStats.conversionRate.toFixed(2)}%`} />
            </div>
          ) : (
            <div className="text-muted-foreground">Loading...</div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {manualHistory.isStale ? (
                <span className="text-yellow-500">Stale - Manual refresh needed</span>
              ) : (
                <span className="text-green-500">Fresh</span>
              )}
            </div>
            <button
              onClick={() => manualSync()}
              disabled={isManualSyncing}
              className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
              {isManualSyncing ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
          {manualError && (
            <div className="mt-4 rounded bg-destructive/10 p-3 text-sm text-destructive">
              Sync failed: {manualError.message}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            Strategy: Never auto-syncs - full manual control
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}

function StatDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/50 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
