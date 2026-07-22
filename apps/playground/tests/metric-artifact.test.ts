import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  carryForwardLastSuccessfulRun,
  evaluateMetricArtifact,
  metricArtifactSchema,
  type MetricArtifact,
} from '../src/lib/metric-artifact.ts';
import { loadMetricFeed } from '../src/lib/metric-feed.ts';

const sourceCommit = 'a'.repeat(40);
const measuredAt = '2026-07-22T08:00:00.000Z';
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const execFileAsync = promisify(execFile);

function createArtifact(): MetricArtifact {
  return {
    schemaVersion: 1,
    scenarioVersion: 1,
    scenarioId: 'sync-staleness',
    runId: measuredAt,
    source: {
      commitSha: sourceCommit,
      dirty: false,
    },
    build: {
      appVersion: '0.0.0',
      packages: {
        '@firsttx/local-first': '0.11.4',
      },
      fingerprint: 'fixture',
    },
    environment: {
      browser: 'chromium',
      os: 'linux',
      viewport: {
        width: 1280,
        height: 720,
      },
      dpr: 1,
      cpuProfile: 'uncontrolled',
      networkProfile: 'uncontrolled',
    },
    sampling: {
      warmupRuns: 0,
      measuredRuns: 1,
      aggregation: 'all',
      rawArtifactPath: 'playwright-report/sync-staleness',
    },
    measuredAt,
    currentStatus: 'passed',
    lastSuccessfulRunId: measuredAt,
    metrics: {
      'stale-mount-triggers-sync': {
        kind: 'contract',
        passed: true,
        fetchCount: 1,
        isStale: false,
      },
      'never-mount-skips-sync': {
        kind: 'contract',
        passed: true,
        automaticFetchCount: 0,
        manualFetchCount: 1,
        isStale: false,
      },
    },
  };
}

function createFailedArtifact(lastSuccessfulRunId: string | null = null): MetricArtifact {
  const artifact = createArtifact();
  artifact.currentStatus = 'failed';
  artifact.lastSuccessfulRunId = lastSuccessfulRunId;
  artifact.metrics['stale-mount-triggers-sync'].passed = false;
  artifact.metrics['stale-mount-triggers-sync'].fetchCount = 0;
  artifact.metrics['stale-mount-triggers-sync'].isStale = true;
  return artifact;
}

function createManifest(artifact: MetricArtifact) {
  return {
    schemaVersion: 1,
    publishedAt: artifact.measuredAt,
    sourceCommit: artifact.source.commitSha,
    scenarios: {
      'sync-staleness': {
        artifactPath: '/metrics/runs/fixture/sync-staleness.json',
        currentStatus: artifact.currentStatus,
        lastSuccessfulRunId: artifact.lastSuccessfulRunId,
      },
    },
  };
}

function createFetcher(responses: Record<string, Response>) {
  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    return (responses[url] ?? new Response(null, { status: 404 })).clone();
  }) as typeof fetch;
}

test('accepts the sync-staleness contract artifact', () => {
  assert.equal(metricArtifactSchema.safeParse(createArtifact()).success, true);
});

test('rejects missing provenance and unknown metric ids', () => {
  const missingSource = structuredClone(createArtifact()) as unknown as Record<string, unknown>;
  delete missingSource.source;
  assert.equal(metricArtifactSchema.safeParse(missingSource).success, false);

  const unknownMetric = structuredClone(createArtifact()) as unknown as {
    metrics: Record<string, unknown>;
  };
  unknownMetric.metrics['unknown-metric'] = { kind: 'contract', passed: true };
  assert.equal(metricArtifactSchema.safeParse(unknownMetric).success, false);
});

test('rejects status and last-success values that contradict metric results', () => {
  const passedWithoutCurrentRun = createArtifact();
  passedWithoutCurrentRun.lastSuccessfulRunId = null;
  assert.equal(metricArtifactSchema.safeParse(passedWithoutCurrentRun).success, false);

  const failedWithPassingMetrics = createArtifact();
  failedWithPassingMetrics.currentStatus = 'failed';
  failedWithPassingMetrics.lastSuccessfulRunId = null;
  assert.equal(metricArtifactSchema.safeParse(failedWithPassingMetrics).success, false);

  assert.equal(metricArtifactSchema.safeParse(createFailedArtifact('previous-run')).success, true);
});

test('marks source mismatches and expired artifacts as stale', () => {
  const artifact = createArtifact();
  const measuredTime = Date.parse(measuredAt);

  assert.deepEqual(evaluateMetricArtifact(artifact, sourceCommit, measuredTime), {
    status: 'passed',
    issue: null,
  });
  assert.deepEqual(evaluateMetricArtifact(artifact, 'b'.repeat(40), measuredTime), {
    status: 'stale',
    issue: 'source-mismatch',
  });
  assert.deepEqual(evaluateMetricArtifact(artifact, sourceCommit, measuredTime + 86_400_001), {
    status: 'stale',
    issue: 'expired',
  });
});

test('does not accept dirty source artifacts as current', () => {
  const artifact = createArtifact();
  artifact.source.dirty = true;

  assert.deepEqual(evaluateMetricArtifact(artifact, sourceCommit, Date.parse(measuredAt)), {
    status: 'stale',
    issue: 'dirty-source',
  });
});

test('evaluates provenance and freshness before failed current status', () => {
  const artifact = createFailedArtifact();

  assert.deepEqual(evaluateMetricArtifact(artifact, sourceCommit, Date.parse(measuredAt)), {
    status: 'failed',
    issue: null,
  });
  assert.deepEqual(evaluateMetricArtifact(artifact, 'b'.repeat(40), Date.parse(measuredAt)), {
    status: 'stale',
    issue: 'source-mismatch',
  });
  assert.deepEqual(
    evaluateMetricArtifact(artifact, sourceCommit, Date.parse(measuredAt) + 86_400_001),
    {
      status: 'stale',
      issue: 'expired',
    },
  );
});

test('carries the previous successful run across a failed current run', () => {
  const failed = carryForwardLastSuccessfulRun(createFailedArtifact(), 'previous-run');
  const passed = carryForwardLastSuccessfulRun(createArtifact(), 'previous-run');

  assert.equal(failed.lastSuccessfulRunId, 'previous-run');
  assert.equal(passed.lastSuccessfulRunId, passed.runId);
});

test('publisher carries last-success into a failed immutable artifact', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'firsttx-metrics-'));
  const metricsDir = path.join(temporaryRoot, 'input');
  const publicMetricsDir = path.join(temporaryRoot, 'public', 'metrics');
  const artifact = createFailedArtifact();
  const previousArtifact = createArtifact();
  previousArtifact.runId = 'previous-run';
  previousArtifact.lastSuccessfulRunId = 'previous-run';

  try {
    await mkdir(metricsDir, { recursive: true });
    await mkdir(publicMetricsDir, { recursive: true });
    await writeFile(
      path.join(metricsDir, 'sync-staleness.latest.json'),
      JSON.stringify(artifact),
      'utf-8',
    );
    await writeFile(
      path.join(publicMetricsDir, 'manifest.json'),
      JSON.stringify(createManifest(previousArtifact)),
      'utf-8',
    );

    await execFileAsync(
      process.execPath,
      [
        '--experimental-strip-types',
        path.join(repositoryRoot, 'apps/playground/scripts/sync-metrics.ts'),
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          METRICS_INPUT_DIR: metricsDir,
          METRICS_PUBLIC_DIR: publicMetricsDir,
          METRICS_PREVIOUS_MANIFEST_URL: '',
        },
      },
    );

    const manifest = JSON.parse(
      await readFile(path.join(publicMetricsDir, 'manifest.json'), 'utf-8'),
    ) as ReturnType<typeof createManifest>;
    const manifestEntry = manifest.scenarios['sync-staleness'];
    const publishedArtifact = metricArtifactSchema.parse(
      JSON.parse(
        await readFile(
          path.join(publicMetricsDir, manifestEntry.artifactPath.replace('/metrics/', '')),
          'utf-8',
        ),
      ),
    );

    assert.equal(manifestEntry.currentStatus, 'failed');
    assert.equal(manifestEntry.lastSuccessfulRunId, previousArtifact.runId);
    assert.equal(publishedArtifact.currentStatus, 'failed');
    assert.equal(publishedArtifact.lastSuccessfulRunId, previousArtifact.runId);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('loads a valid feed and leaves unreported scenarios not measured', async () => {
  const artifact = createArtifact();
  const baseUrl = 'https://metrics.example.test';
  const scenarios = await loadMetricFeed({
    baseUrl,
    currentSourceRevision: sourceCommit,
    scenarioIds: ['sync-staleness', 'sync-suspense'],
    fetcher: createFetcher({
      [`${baseUrl}/metrics/manifest.json`]: Response.json(createManifest(artifact)),
      [`${baseUrl}/metrics/runs/fixture/sync-staleness.json`]: Response.json(artifact),
    }),
    now: Date.parse(measuredAt),
  });

  assert.equal(scenarios['sync-staleness']?.status, 'passed');
  assert.equal(scenarios['sync-staleness']?.issue, null);
  assert.equal(scenarios['sync-suspense']?.status, 'not-measured');
  assert.equal(scenarios['sync-suspense']?.issue, 'unreported');
});

test('distinguishes unavailable and invalid feeds', async () => {
  const baseUrl = 'https://metrics.example.test';
  const unavailable = await loadMetricFeed({
    baseUrl,
    currentSourceRevision: sourceCommit,
    scenarioIds: ['sync-staleness'],
    fetcher: createFetcher({}),
    now: Date.parse(measuredAt),
  });
  const invalid = await loadMetricFeed({
    baseUrl,
    currentSourceRevision: sourceCommit,
    scenarioIds: ['sync-staleness'],
    fetcher: createFetcher({
      [`${baseUrl}/metrics/manifest.json`]: new Response('{', { status: 200 }),
    }),
    now: Date.parse(measuredAt),
  });

  assert.equal(unavailable['sync-staleness']?.issue, 'feed-unavailable');
  assert.equal(invalid['sync-staleness']?.issue, 'invalid-manifest');
});

test('marks loaded source mismatches and expired artifacts stale', async () => {
  const artifact = createArtifact();
  const baseUrl = 'https://metrics.example.test';
  const fetcher = createFetcher({
    [`${baseUrl}/metrics/manifest.json`]: Response.json(createManifest(artifact)),
    [`${baseUrl}/metrics/runs/fixture/sync-staleness.json`]: Response.json(artifact),
  });
  const mismatch = await loadMetricFeed({
    baseUrl,
    currentSourceRevision: 'b'.repeat(40),
    scenarioIds: ['sync-staleness'],
    fetcher,
    now: Date.parse(measuredAt),
  });
  const expired = await loadMetricFeed({
    baseUrl,
    currentSourceRevision: sourceCommit,
    scenarioIds: ['sync-staleness'],
    fetcher,
    now: Date.parse(measuredAt) + 86_400_001,
  });

  assert.equal(mismatch['sync-staleness']?.issue, 'source-mismatch');
  assert.equal(expired['sync-staleness']?.issue, 'expired');
});

test('rejects a manifest whose last-success state differs from its artifact', async () => {
  const artifact = createFailedArtifact('previous-run');
  const manifest = createManifest(artifact);
  manifest.scenarios['sync-staleness'].lastSuccessfulRunId = 'different-run';
  const baseUrl = 'https://metrics.example.test';
  const scenarios = await loadMetricFeed({
    baseUrl,
    currentSourceRevision: sourceCommit,
    scenarioIds: ['sync-staleness'],
    fetcher: createFetcher({
      [`${baseUrl}/metrics/manifest.json`]: Response.json(manifest),
      [`${baseUrl}/metrics/runs/fixture/sync-staleness.json`]: Response.json(artifact),
    }),
    now: Date.parse(measuredAt),
  });

  assert.equal(scenarios['sync-staleness']?.status, 'not-measured');
  assert.equal(scenarios['sync-staleness']?.issue, 'invalid-artifact');
});

test('keeps the metrics directory under the deployed Pages root', async () => {
  const workflow = await readFile(
    path.join(repositoryRoot, '.github/workflows/playground-metrics.yml'),
    'utf-8',
  );

  assert.match(workflow, /id: metrics_suite\n\s+continue-on-error: true/);
  assert.match(workflow, /path: apps\/playground\/public\n/);
  assert.match(
    workflow,
    /name: Upload Pages artifact[\s\S]+id: pages_artifact[\s\S]+name: Preserve metrics suite failure/,
  );
  assert.match(
    workflow,
    /if: \$\{\{ always\(\) && needs\.metrics\.outputs\.pages_ready == 'true' \}\}/,
  );
  assert.match(workflow, /EXPECTED_STATUS: \$\{\{ needs\.metrics\.outputs\.current_status \}\}/);
  assert.doesNotMatch(workflow, /currentStatus' <<< "\$artifact"\)" = "passed"/);
});
