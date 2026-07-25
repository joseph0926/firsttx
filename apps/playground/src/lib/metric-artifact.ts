import { z } from 'zod';

export const metricArtifactStatusSchema = z.enum([
  'passed',
  'failed',
  'expected-limitation',
  'not-measured',
  'stale',
  'unsupported',
]);

export const metricLoadIssueSchema = z.enum([
  'feed-unavailable',
  'invalid-manifest',
  'artifact-unavailable',
  'invalid-artifact',
  'dirty-source',
  'source-unavailable',
  'source-mismatch',
  'expired',
  'unreported',
]);

const sourceSchema = z.object({
  commitSha: z.string().regex(/^[0-9a-f]{40}$/),
  dirty: z.boolean(),
});

const buildSchema = z.object({
  appVersion: z.string().min(1),
  packages: z.record(z.string().min(1)),
  fingerprint: z.string().min(1),
});

const environmentSchema = z.object({
  browser: z.string().min(1),
  os: z.string().min(1),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  dpr: z.number().positive(),
  cpuProfile: z.string().min(1),
  networkProfile: z.string().min(1),
});

const samplingSchema = z.object({
  warmupRuns: z.number().int().nonnegative(),
  measuredRuns: z.number().int().positive(),
  aggregation: z.enum(['all', 'median', 'p95', 'median,p95']),
  rawArtifactPath: z.string().min(1),
});

const syncStalenessArtifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioVersion: z.literal(1),
    scenarioId: z.literal('sync-staleness'),
    runId: z.string().min(1),
    source: sourceSchema,
    build: buildSchema,
    environment: environmentSchema,
    sampling: samplingSchema,
    measuredAt: z.string().datetime(),
    currentStatus: z.enum(['passed', 'failed']),
    lastSuccessfulRunId: z.string().min(1).nullable(),
    metrics: z
      .object({
        'stale-mount-triggers-sync': z.object({
          kind: z.literal('contract'),
          passed: z.boolean(),
          fetchCount: z.number().int().nonnegative(),
          isStale: z.boolean(),
        }),
        'never-mount-skips-sync': z.object({
          kind: z.literal('contract'),
          passed: z.boolean(),
          automaticFetchCount: z.number().int().nonnegative(),
          manualFetchCount: z.number().int().nonnegative(),
          isStale: z.boolean(),
        }),
      })
      .strict(),
  })
  .strict();

const instantCartEventSchema = z.enum([
  'optimistic-patch',
  'optimistic-paint',
  'server-gate-released',
  'request-started',
  'server-gate-completed',
  'server-acknowledged',
]);

const benchmarkMetricSchema = z
  .object({
    kind: z.literal('benchmark'),
    unit: z.literal('ms'),
    samples: z.array(z.number().finite().positive()).max(20),
    failedSamples: z.number().int().nonnegative(),
    median: z.number().finite().positive().nullable(),
    p95: z.number().finite().positive().nullable(),
  })
  .strict();

const syncInstantCartArtifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioVersion: z.literal(1),
    scenarioId: z.literal('sync-instant-cart'),
    runId: z.string().min(1),
    source: sourceSchema,
    build: buildSchema,
    environment: environmentSchema,
    sampling: z
      .object({
        warmupRuns: z.number().int().min(0).max(3),
        measuredRuns: z.number().int().min(0).max(20),
        aggregation: z.literal('median,p95'),
        rawArtifactPath: z.string().min(1),
      })
      .strict(),
    measuredAt: z.string().datetime(),
    currentStatus: z.enum(['passed', 'failed']),
    lastSuccessfulRunId: z.string().min(1).nullable(),
    metrics: z
      .object({
        'optimistic-paint-precedes-ack': z
          .object({
            kind: z.literal('contract'),
            passed: z.boolean(),
            passedRuns: z.number().int().min(0).max(20),
            events: z.array(instantCartEventSchema).max(6),
          })
          .strict(),
        'input-to-optimistic-paint-ms': benchmarkMetricSchema,
        'server-ack-ms': benchmarkMetricSchema,
        'traditional-input-to-paint-ms': benchmarkMetricSchema,
      })
      .strict(),
  })
  .strict();

const expectedInstantCartEvents = [
  'optimistic-patch',
  'optimistic-paint',
  'server-gate-released',
  'request-started',
  'server-gate-completed',
  'server-acknowledged',
] as const;

export function summarizeBenchmarkSamples(samples: number[]) {
  if (samples.length === 0) {
    return { median: null, p95: null };
  }

  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];

  return { median, p95 };
}

function validateBenchmarkMetric(
  metric: z.infer<typeof benchmarkMetricSchema>,
  path: string,
  context: z.RefinementCtx,
) {
  const summary = summarizeBenchmarkSamples(metric.samples);
  if (metric.median !== summary.median || metric.p95 !== summary.p95) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['metrics', path],
      message: 'Benchmark aggregates must match the raw samples',
    });
  }
}

export const metricArtifactSchema = z
  .discriminatedUnion('scenarioId', [syncStalenessArtifactSchema, syncInstantCartArtifactSchema])
  .superRefine((artifact, context) => {
    let metricsPassed: boolean;

    if (artifact.scenarioId === 'sync-staleness') {
      metricsPassed =
        artifact.metrics['stale-mount-triggers-sync'].passed &&
        artifact.metrics['never-mount-skips-sync'].passed;
    } else {
      const contractMetric = artifact.metrics['optimistic-paint-precedes-ack'];
      const benchmarkMetrics = [
        ['input-to-optimistic-paint-ms', artifact.metrics['input-to-optimistic-paint-ms']],
        ['server-ack-ms', artifact.metrics['server-ack-ms']],
        ['traditional-input-to-paint-ms', artifact.metrics['traditional-input-to-paint-ms']],
      ] as const;

      for (const [path, metric] of benchmarkMetrics) {
        validateBenchmarkMetric(metric, path, context);
      }

      const eventsMatch =
        contractMetric.events.length === expectedInstantCartEvents.length &&
        contractMetric.events.every((event, index) => event === expectedInstantCartEvents[index]);
      const benchmarkComplete = benchmarkMetrics.every(
        ([, metric]) => metric.samples.length === 20 && metric.failedSamples === 0,
      );
      metricsPassed =
        contractMetric.passed &&
        contractMetric.passedRuns === 20 &&
        eventsMatch &&
        artifact.sampling.warmupRuns === 3 &&
        artifact.sampling.measuredRuns === 20 &&
        benchmarkComplete;
    }

    if ((artifact.currentStatus === 'passed') !== metricsPassed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentStatus'],
        message: 'currentStatus must match the contract metric results',
      });
    }

    if (artifact.currentStatus === 'passed' && artifact.lastSuccessfulRunId !== artifact.runId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastSuccessfulRunId'],
        message: 'A passed run must be the last successful run',
      });
    }

    if (artifact.currentStatus === 'failed' && artifact.lastSuccessfulRunId === artifact.runId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastSuccessfulRunId'],
        message: 'A failed run cannot be the last successful run',
      });
    }
  });

const metricManifestScenarioSchema = z
  .object({
    artifactPath: z.string().startsWith('/metrics/runs/'),
    currentStatus: metricArtifactStatusSchema,
    lastSuccessfulRunId: z.string().min(1).nullable(),
  })
  .strict();

export const metricManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    publishedAt: z.string().datetime(),
    sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
    scenarios: z.record(metricManifestScenarioSchema),
  })
  .strict();

export type MetricArtifactStatus = z.infer<typeof metricArtifactStatusSchema>;
export type MetricLoadIssue = z.infer<typeof metricLoadIssueSchema>;
export type MetricArtifact = z.infer<typeof metricArtifactSchema>;
export type SyncStalenessMetricArtifact = Extract<MetricArtifact, { scenarioId: 'sync-staleness' }>;
export type SyncInstantCartMetricArtifact = Extract<
  MetricArtifact,
  { scenarioId: 'sync-instant-cart' }
>;
export type MetricManifest = z.infer<typeof metricManifestSchema>;

export interface MetricArtifactEvaluation {
  status: MetricArtifactStatus;
  issue: MetricLoadIssue | null;
}

const CONTRACT_FRESHNESS_MS = 24 * 60 * 60 * 1000;

export function carryForwardLastSuccessfulRun(
  artifact: MetricArtifact,
  previousLastSuccessfulRunId: string | null,
): MetricArtifact {
  return metricArtifactSchema.parse({
    ...artifact,
    lastSuccessfulRunId:
      artifact.currentStatus === 'passed'
        ? artifact.runId
        : (artifact.lastSuccessfulRunId ?? previousLastSuccessfulRunId),
  });
}

export function evaluateMetricArtifact(
  artifact: MetricArtifact,
  currentSourceCommit: string,
  now = Date.now(),
): MetricArtifactEvaluation {
  if (artifact.source.dirty) {
    return { status: 'stale', issue: 'dirty-source' };
  }

  if (!currentSourceCommit) {
    return { status: 'stale', issue: 'source-unavailable' };
  }

  if (artifact.source.commitSha !== currentSourceCommit) {
    return { status: 'stale', issue: 'source-mismatch' };
  }

  if (now - Date.parse(artifact.measuredAt) > CONTRACT_FRESHNESS_MS) {
    return { status: 'stale', issue: 'expired' };
  }

  if (artifact.currentStatus === 'failed') {
    return { status: 'failed', issue: null };
  }

  return { status: 'passed', issue: null };
}
