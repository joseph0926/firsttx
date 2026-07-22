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

export const metricArtifactSchema = z
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
  .strict()
  .superRefine((artifact, context) => {
    const metricsPassed =
      artifact.metrics['stale-mount-triggers-sync'].passed &&
      artifact.metrics['never-mount-skips-sync'].passed;

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
