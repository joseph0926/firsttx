import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface MetricRecord {
  scenario: string;
  runId: string;
  metrics: Record<string, number | string | boolean | null>;
  meta?: Record<string, unknown>;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const metricsDir = path.resolve(currentDir, '../../.metrics');

export async function writeMetrics(record: MetricRecord) {
  await fs.mkdir(metricsDir, { recursive: true });
  const filePath = path.join(metricsDir, `${record.scenario}.latest.json`);
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
