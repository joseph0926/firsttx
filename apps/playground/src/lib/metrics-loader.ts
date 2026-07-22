import { playgroundScenarioContracts } from '@/data/playground-contract';
import { loadMetricFeed } from '@/lib/metric-feed';
import { PlaygroundMetricsModel } from '@/models/metrics.model';

declare const __PLAYGROUND_METRICS_BASE__: string;
declare const __PLAYGROUND_SOURCE_REVISION__: string;

const DEFAULT_METRICS_BASE = 'https://joseph0926.github.io/firsttx';
const configuredMetricsBase =
  import.meta.env.VITE_METRICS_BASE_URL ||
  (typeof __PLAYGROUND_METRICS_BASE__ === 'string' ? __PLAYGROUND_METRICS_BASE__ : '');
const metricsBase = configuredMetricsBase || DEFAULT_METRICS_BASE;
const currentSourceRevision =
  typeof __PLAYGROUND_SOURCE_REVISION__ === 'string' ? __PLAYGROUND_SOURCE_REVISION__ : '';

export async function loadMetricsFromPublic() {
  const scenarios = await loadMetricFeed({
    baseUrl: metricsBase,
    currentSourceRevision,
    scenarioIds: playgroundScenarioContracts.map((scenario) => scenario.id),
  });
  await PlaygroundMetricsModel.replace({ scenarios });
}
