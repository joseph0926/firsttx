import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { metricArtifactSchema, type MetricArtifact } from '../../src/lib/metric-artifact';

export interface MetricRecord {
  scenario: string;
  runId: string;
  metrics: Record<string, number | string | boolean | null>;
  meta?: Record<string, unknown>;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const metricsDir = path.resolve(currentDir, '../../.metrics');
const repositoryRoot = path.resolve(currentDir, '../../../..');
const execFileAsync = promisify(execFile);

export async function writeMetrics(record: MetricRecord | MetricArtifact) {
  await fs.mkdir(metricsDir, { recursive: true });
  const scenario = 'scenarioId' in record ? record.scenarioId : record.scenario;
  const filePath = path.join(metricsDir, `${scenario}.latest.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

export function createMetricRecord(
  scenario: string,
  metrics: Record<string, number | string | boolean | null>,
  meta?: Record<string, unknown>,
): MetricRecord {
  return {
    scenario,
    runId: new Date().toISOString(),
    metrics,
    ...(meta ? { meta } : {}),
  };
}

interface SyncStalenessMetricValues {
  staleMount: {
    fetchCount: number;
    isStale: boolean;
  };
  neverMount: {
    automaticFetchCount: number;
    manualFetchCount: number;
    isStale: boolean;
  };
}

interface MetricEnvironment {
  browser: string;
  viewport: {
    width: number;
    height: number;
  };
  dpr: number;
}

async function readPackageVersion(relativePath: string) {
  const contents = await fs.readFile(path.join(repositoryRoot, relativePath), 'utf-8');
  const packageJson = JSON.parse(contents) as { version: string };
  return packageJson.version;
}

async function getSource() {
  const commitSha =
    process.env.GITHUB_SHA ??
    process.env.METRICS_SOURCE_SHA ??
    (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot })).stdout.trim();
  const dirty =
    process.env.GITHUB_ACTIONS === 'true'
      ? false
      : Boolean(
          (
            await execFileAsync('git', ['status', '--porcelain'], { cwd: repositoryRoot })
          ).stdout.trim(),
        );
  return { commitSha, dirty };
}

export async function createSyncStalenessArtifact(
  values: SyncStalenessMetricValues,
  environment: MetricEnvironment,
): Promise<MetricArtifact> {
  const measuredAt = new Date().toISOString();
  const source = await getSource();
  const packages = {
    '@firsttx/local-first': await readPackageVersion('packages/local-first/package.json'),
    '@firsttx/prepaint': await readPackageVersion('packages/prepaint/package.json'),
    '@firsttx/tx': await readPackageVersion('packages/tx/package.json'),
  };
  const appVersion = await readPackageVersion('apps/playground/package.json');
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ appVersion, packages, source: source.commitSha }))
    .digest('hex');
  const staleMountPassed = values.staleMount.fetchCount === 1 && !values.staleMount.isStale;
  const neverMountPassed =
    values.neverMount.automaticFetchCount === 0 &&
    values.neverMount.manualFetchCount === 1 &&
    !values.neverMount.isStale;
  const currentStatus = staleMountPassed && neverMountPassed ? 'passed' : 'failed';

  return metricArtifactSchema.parse({
    schemaVersion: 1,
    scenarioVersion: 1,
    scenarioId: 'sync-staleness',
    runId: measuredAt,
    source,
    build: {
      appVersion,
      packages,
      fingerprint,
    },
    environment: {
      browser: environment.browser,
      os: process.platform,
      viewport: environment.viewport,
      dpr: environment.dpr,
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
    currentStatus,
    lastSuccessfulRunId: currentStatus === 'passed' ? measuredAt : null,
    metrics: {
      'stale-mount-triggers-sync': {
        kind: 'contract',
        passed: staleMountPassed,
        fetchCount: values.staleMount.fetchCount,
        isStale: values.staleMount.isStale,
      },
      'never-mount-skips-sync': {
        kind: 'contract',
        passed: neverMountPassed,
        automaticFetchCount: values.neverMount.automaticFetchCount,
        manualFetchCount: values.neverMount.manualFetchCount,
        isStale: values.neverMount.isStale,
      },
    },
  });
}
