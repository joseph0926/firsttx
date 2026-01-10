import { PlaygroundMetricsModel, type ScenarioMetrics } from '@/models/metrics.model';

declare global {
  interface Window {
    __PLAYGROUND_METRICS_BASE__?: string;
  }
}

interface MetricFilePayload {
  scenario: string;
  runId: string;
  metrics: Record<string, number | string | boolean>;
  meta?: Record<string, unknown>;
}

interface MetricSource {
  id: string;
  file: string;
  title: string;
}

const metricsBase =
  import.meta.env.VITE_METRICS_BASE_URL ??
  (typeof window !== 'undefined' ? window.__PLAYGROUND_METRICS_BASE__ : undefined) ??
  '';

const withBase = (file: string) => {
  if (!metricsBase) return file;
  return `${metricsBase.replace(/\/$/, '')}${file}`;
};

const METRIC_SOURCES: MetricSource[] = [
  {
    id: 'prepaint-heavy',
    file: withBase('/metrics/prepaint-heavy.latest.json'),
    title: 'Prepaint Heavy',
  },
  {
    id: 'instant-cart',
    file: withBase('/metrics/instant-cart.latest.json'),
    title: 'Instant Cart',
  },
  {
    id: 'tx-concurrent',
    file: withBase('/metrics/tx-concurrent.latest.json'),
    title: 'Concurrent Updates',
  },
];

export async function loadMetricsFromPublic() {
  if (!metricsBase) {
    return;
  }

  const current = (await PlaygroundMetricsModel.getSnapshot()) ?? { scenarios: {} };
  const scenarios = { ...current.scenarios };

  await Promise.all(
    METRIC_SOURCES.map(async (source) => {
      try {
        const response = await fetch(source.file, { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as MetricFilePayload;
        const record: ScenarioMetrics = {
          scenarioId: payload.scenario ?? source.id,
          runId: payload.runId,
          metrics: payload.metrics,
          meta: payload.meta ?? null,
          updatedAt: Date.now(),
        };
        scenarios[source.id] = record;
      } catch {
        // Silently ignore fetch errors
      }
    }),
  );

  await PlaygroundMetricsModel.replace({ scenarios });
}
