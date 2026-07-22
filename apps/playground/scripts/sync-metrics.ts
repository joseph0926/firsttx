import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  carryForwardLastSuccessfulRun,
  metricArtifactSchema,
  metricManifestSchema,
  type MetricArtifact,
  type MetricManifest,
} from '../src/lib/metric-artifact.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metricsDir = process.env.METRICS_INPUT_DIR ?? path.join(projectRoot, '.metrics');
const publicMetricsDir =
  process.env.METRICS_PUBLIC_DIR ?? path.join(projectRoot, 'public', 'metrics');
const runsDir = path.join(publicMetricsDir, 'runs');
const legacyDir = path.join(publicMetricsDir, 'legacy');
const previousManifestUrl = process.env.METRICS_PREVIOUS_MANIFEST_URL;

function getRunDirectory(runId: string) {
  return runId.replace(/[^a-zA-Z0-9_-]/g, '-');
}

async function publishArtifact(artifact: MetricArtifact) {
  const runDirectory = getRunDirectory(artifact.runId);
  const targetDir = path.join(runsDir, runDirectory);
  const target = path.join(targetDir, `${artifact.scenarioId}.json`);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(artifact, null, 2)}\n`, 'utf-8');
  return `/metrics/runs/${runDirectory}/${artifact.scenarioId}.json`;
}

async function readPreviousManifest() {
  if (previousManifestUrl) {
    const response = await fetch(previousManifestUrl, { cache: 'no-store' });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to read previous metric manifest: ${response.status}`);
    }
    return metricManifestSchema.parse(await response.json());
  }

  try {
    const payload: unknown = JSON.parse(
      await fs.readFile(path.join(publicMetricsDir, 'manifest.json'), 'utf-8'),
    );
    return metricManifestSchema.parse(payload);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function publishManifest(
  artifacts: MetricArtifact[],
  previousManifest: MetricManifest | null,
) {
  const sourceCommit = artifacts[0]?.source.commitSha;
  if (!sourceCommit) {
    throw new Error('No schema v1 metric artifact was generated');
  }

  if (artifacts.some((artifact) => artifact.source.commitSha !== sourceCommit)) {
    throw new Error('Metric artifacts reference different source commits');
  }

  const scenarios: MetricManifest['scenarios'] = {};
  for (const artifact of artifacts) {
    const publishedArtifact = carryForwardLastSuccessfulRun(
      artifact,
      previousManifest?.scenarios[artifact.scenarioId]?.lastSuccessfulRunId ?? null,
    );
    scenarios[publishedArtifact.scenarioId] = {
      artifactPath: await publishArtifact(publishedArtifact),
      currentStatus: publishedArtifact.currentStatus,
      lastSuccessfulRunId: publishedArtifact.lastSuccessfulRunId,
    };
  }

  const manifest = metricManifestSchema.parse({
    schemaVersion: 1,
    publishedAt: new Date().toISOString(),
    sourceCommit,
    scenarios,
  });
  const temporaryManifest = path.join(publicMetricsDir, 'manifest.json.tmp');
  const manifestPath = path.join(publicMetricsDir, 'manifest.json');
  await fs.writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  await fs.rename(temporaryManifest, manifestPath);
}

async function syncMetrics() {
  const previousManifest = await readPreviousManifest();
  const entries = await fs.readdir(metricsDir, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));
  const artifacts: MetricArtifact[] = [];

  await fs.mkdir(publicMetricsDir, { recursive: true });
  await fs.mkdir(legacyDir, { recursive: true });

  for (const entry of jsonFiles) {
    const source = path.join(metricsDir, entry.name);
    const payload: unknown = JSON.parse(await fs.readFile(source, 'utf-8'));
    const result = metricArtifactSchema.safeParse(payload);

    if (result.success) {
      artifacts.push(result.data);
      continue;
    }

    if (typeof payload === 'object' && payload !== null && 'schemaVersion' in payload) {
      throw new Error(`Invalid schema v1 metric artifact: ${entry.name}`);
    }

    await fs.copyFile(source, path.join(legacyDir, entry.name));
  }

  await publishManifest(artifacts, previousManifest);
  console.log(`[metrics:sync] Published ${artifacts.length} schema v1 artifact(s)`);
}

syncMetrics().catch((error) => {
  console.error('[metrics:sync] Failed to sync metrics:', error);
  process.exitCode = 1;
});
