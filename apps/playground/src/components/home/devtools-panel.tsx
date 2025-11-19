import { useEffect, useMemo, useState } from 'react';
import { Zap, Database, GitBranch } from 'lucide-react';
import { useModel } from '@firsttx/local-first';
import type { PlaygroundMetrics } from '@/models/metrics.model';
import { PrepaintMetricsModel } from '@/models/prepaint-metrics.model';
import { useHandoffStrategy } from '@/lib/prepaint-handshake';
import { CartModel } from '@/models/cart.model';
import { ProductsModel } from '@/models/products.model';
import { RouteMetricsModel } from '@/models/route-metrics.model';

const localModels = [CartModel, ProductsModel, RouteMetricsModel];

type DevtoolsPanelProps = {
  scenarioMetrics: PlaygroundMetrics['scenarios'];
};

type LocalFirstSummary = {
  total: number;
  stale: number;
  lastUpdated: number | null;
};

function useLocalFirstSummary(): LocalFirstSummary {
  const [summary, setSummary] = useState<LocalFirstSummary>({
    total: 0,
    stale: 0,
    lastUpdated: null,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const histories = await Promise.all(localModels.map((model) => model.getHistory()));
      if (cancelled) return;
      const stale = histories.filter((history) => history.isStale).length;
      const latest = histories.reduce((max, history) => Math.max(max, history.updatedAt), 0);
      setSummary({ total: histories.length, stale, lastUpdated: latest || null });
    };
    void load();
    const id = setInterval(() => {
      void load();
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return summary;
}

function formatTimestamp(value: number | null): string {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString();
}

export function DevtoolsPanel({ scenarioMetrics }: DevtoolsPanelProps) {
  const [prepaintMetrics] = useModel(PrepaintMetricsModel);
  const handoffStrategy = useHandoffStrategy() ?? prepaintMetrics?.lastHandoffStrategy ?? null;
  const localSummary = useLocalFirstSummary();

  const instantCartMetrics = scenarioMetrics['instant-cart']?.metrics;
  const txConcurrentMetrics = scenarioMetrics['tx-concurrent']?.metrics;

  const prepaintSummary = useMemo(() => {
    if (!prepaintMetrics) {
      return {
        strategyLabel: handoffStrategy ?? 'Unknown',
        captureCount: '--',
        lastCapture: '--',
      };
    }
    return {
      strategyLabel: handoffStrategy ?? 'Unknown',
      captureCount: prepaintMetrics.captureCount.toString(),
      lastCapture: formatTimestamp(prepaintMetrics.lastCaptureAt),
    };
  }, [handoffStrategy, prepaintMetrics]);

  const localFirstStats = useMemo(() => {
    const freshness =
      localSummary.total === 0
        ? '--'
        : `${localSummary.total - localSummary.stale}/${localSummary.total} fresh`;
    const instantLatency =
      instantCartMetrics && typeof instantCartMetrics['timeSavedPerInteraction'] === 'number'
        ? `${instantCartMetrics['timeSavedPerInteraction'].toFixed(0)}ms saved`
        : '--';
    return {
      freshness,
      instantLatency,
      lastUpdated: formatTimestamp(localSummary.lastUpdated),
    };
  }, [instantCartMetrics, localSummary]);

  const txStats = useMemo(() => {
    const successRate =
      txConcurrentMetrics && typeof txConcurrentMetrics['successRate'] === 'number'
        ? `${txConcurrentMetrics['successRate'].toFixed(1)}%`
        : '--';
    const avgDuration =
      txConcurrentMetrics && typeof txConcurrentMetrics['avgDuration'] === 'number'
        ? `${txConcurrentMetrics['avgDuration'].toFixed(1)}ms`
        : '--';
    return {
      successRate,
      avgDuration,
    };
  }, [txConcurrentMetrics]);

  return (
    <div className="mb-10 rounded-2xl border border-border bg-card/40 p-6 shadow-inner">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground tracking-wide">FirstTx Telemetry</p>
          <h3 className="text-xl font-semibold">Runtime Diagnostics</h3>
        </div>
        <span className="text-xs text-muted-foreground">Live refresh every few seconds</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/80 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-yellow-400" />
            Prepaint
          </div>
          <div className="text-2xl font-semibold">{prepaintSummary.strategyLabel}</div>
          <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>Capture Count</dt>
              <dd>{prepaintSummary.captureCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Last Capture</dt>
              <dd>{prepaintSummary.lastCapture}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-background/80 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4 text-green-400" />
            Local-First
          </div>
          <div className="text-2xl font-semibold">{localFirstStats.freshness}</div>
          <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>Instant Cart</dt>
              <dd>{localFirstStats.instantLatency}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Last Update</dt>
              <dd>{localFirstStats.lastUpdated}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-background/80 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <GitBranch className="h-4 w-4 text-blue-400" />
            Tx Layer
          </div>
          <div className="text-2xl font-semibold">{txStats.successRate}</div>
          <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>Avg Duration</dt>
              <dd>{txStats.avgDuration}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Scenario</dt>
              <dd>Concurrent Updates</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
