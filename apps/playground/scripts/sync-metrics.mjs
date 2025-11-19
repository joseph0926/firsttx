import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = new URL('..', import.meta.url);
const projectRoot = path.resolve(rootDir.pathname);
const metricsDir = path.join(projectRoot, '.metrics');
const publicMetricsDir = path.join(projectRoot, 'public', 'metrics');

async function syncMetrics() {
  try {
    await fs.access(metricsDir);
  } catch {
    console.warn('[metrics:sync] No .metrics directory found. Run Playwright tests first.');
    return;
  }

  await fs.mkdir(publicMetricsDir, { recursive: true });

  const entries = await fs.readdir(metricsDir, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.warn('[metrics:sync] No JSON files found in .metrics');
    return;
  }

  await Promise.all(
    jsonFiles.map(async (entry) => {
      const source = path.join(metricsDir, entry.name);
      const target = path.join(publicMetricsDir, entry.name);
      await fs.copyFile(source, target);
      console.log(`[metrics:sync] Copied ${entry.name}`);
    }),
  );
}

syncMetrics().catch((error) => {
  console.error('[metrics:sync] Failed to sync metrics:', error);
  process.exitCode = 1;
});

