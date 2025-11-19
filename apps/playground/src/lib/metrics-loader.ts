import { PlaygroundMetricsModel, type ScenarioMetrics } from '@/models/metrics.model';

interface MetricFilePayload {
  scenario: string;
  runId: string;
  metrics: Record<string, number | string>;
  meta?: Record<string, unknown>;
}

interface MetricSource {
  id: string;
  file: string;
  title: string;
}

const METRIC_SOURCES: MetricSource[] = [
  {
    id: 'prepaint-heavy',
    file: '/metrics/prepaint-heavy.latest.json',
    title: 'Prepaint Heavy',
  },
  {
    id: 'instant-cart',
    file: '/metrics/instant-cart.latest.json',
    title: 'Instant Cart',
  },
  {
    id: 'tx-concurrent',
    file: '/metrics/tx-concurrent.latest.json',
    title: 'Concurrent Updates',
  },
];

export async function loadMetricsFromPublic() {
  const current = (await PlaygroundMetricsModel.getSnapshot()) ?? { scenarios: {} };
  const scenarios = { ...current.scenarios };

  await Promise.all(
    METRIC_SOURCES.map(async (source) => {
      try {
        const response = await fetch(source.file, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`${source.file} responded with ${response.status}`);
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
      } catch (error) {
        console.warn(`[metrics] Failed to load ${source.id}:`, error);
      }
    }),
  );

  await PlaygroundMetricsModel.replace({ scenarios });
}
