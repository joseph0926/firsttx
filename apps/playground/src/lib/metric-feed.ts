import {
  evaluateMetricArtifact,
  metricArtifactSchema,
  metricManifestSchema,
  type MetricArtifact,
  type MetricArtifactStatus,
  type MetricLoadIssue,
} from './metric-artifact.ts';

export interface MetricScenarioState {
  scenarioId: string;
  status: MetricArtifactStatus;
  artifact: MetricArtifact | null;
  issue: MetricLoadIssue | null;
  updatedAt: number;
}

interface LoadMetricFeedOptions {
  baseUrl: string;
  currentSourceRevision: string;
  scenarioIds: string[];
  fetcher?: typeof fetch;
  now?: number;
}

function createScenarioState(
  scenarioId: string,
  status: MetricArtifactStatus,
  issue: MetricLoadIssue | null,
  now: number,
  artifact: MetricArtifact | null = null,
): MetricScenarioState {
  return {
    scenarioId,
    status,
    artifact,
    issue,
    updatedAt: now,
  };
}

function createUnavailableScenarios(scenarioIds: string[], issue: MetricLoadIssue, now: number) {
  return Object.fromEntries(
    scenarioIds.map((scenarioId) => [
      scenarioId,
      createScenarioState(scenarioId, 'not-measured', issue, now),
    ]),
  );
}

export async function loadMetricFeed({
  baseUrl,
  currentSourceRevision,
  scenarioIds,
  fetcher = fetch,
  now = Date.now(),
}: LoadMetricFeedOptions): Promise<Record<string, MetricScenarioState>> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetcher(`${normalizedBaseUrl}/metrics/manifest.json`, { cache: 'no-store' });
  } catch {
    return createUnavailableScenarios(scenarioIds, 'feed-unavailable', now);
  }

  if (!response.ok) {
    return createUnavailableScenarios(scenarioIds, 'feed-unavailable', now);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return createUnavailableScenarios(scenarioIds, 'invalid-manifest', now);
  }

  const manifest = metricManifestSchema.safeParse(payload);
  if (!manifest.success) {
    return createUnavailableScenarios(scenarioIds, 'invalid-manifest', now);
  }

  const scenarios = await Promise.all(
    scenarioIds.map(async (scenarioId) => {
      const entry = manifest.data.scenarios[scenarioId];
      if (!entry) {
        return [
          scenarioId,
          createScenarioState(scenarioId, 'not-measured', 'unreported', now),
        ] as const;
      }

      let artifactResponse: Response;
      try {
        artifactResponse = await fetcher(`${normalizedBaseUrl}${entry.artifactPath}`, {
          cache: 'no-store',
        });
      } catch {
        return [
          scenarioId,
          createScenarioState(scenarioId, 'not-measured', 'artifact-unavailable', now),
        ] as const;
      }

      if (!artifactResponse.ok) {
        return [
          scenarioId,
          createScenarioState(scenarioId, 'not-measured', 'artifact-unavailable', now),
        ] as const;
      }

      let artifactPayload: unknown;
      try {
        artifactPayload = await artifactResponse.json();
      } catch {
        return [
          scenarioId,
          createScenarioState(scenarioId, 'not-measured', 'invalid-artifact', now),
        ] as const;
      }

      const artifact = metricArtifactSchema.safeParse(artifactPayload);
      if (
        !artifact.success ||
        artifact.data.scenarioId !== scenarioId ||
        artifact.data.source.commitSha !== manifest.data.sourceCommit ||
        artifact.data.currentStatus !== entry.currentStatus ||
        artifact.data.lastSuccessfulRunId !== entry.lastSuccessfulRunId
      ) {
        return [
          scenarioId,
          createScenarioState(scenarioId, 'not-measured', 'invalid-artifact', now),
        ] as const;
      }

      const evaluation = evaluateMetricArtifact(artifact.data, currentSourceRevision, now);
      return [
        scenarioId,
        createScenarioState(scenarioId, evaluation.status, evaluation.issue, now, artifact.data),
      ] as const;
    }),
  );

  return Object.fromEntries(scenarios);
}
