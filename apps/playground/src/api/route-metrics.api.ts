import type { RouteMetricsData } from '../models/route-metrics.model';

const MOCK_DELAY = 800;

const serverMetrics: RouteMetricsData = {
  '/prepaint/route-switching/dashboard': { visits: 15, avgTime: 12.5 },
  '/prepaint/route-switching/products': { visits: 8, avgTime: 18.3 },
  '/prepaint/route-switching/analytics': { visits: 5, avgTime: 15.7 },
  '/prepaint/route-switching/settings': { visits: 3, avgTime: 10.2 },
};

export async function fetchRouteMetrics(): Promise<RouteMetricsData> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  if (Math.random() < 0.1) {
    throw new Error('Network error: Failed to fetch route metrics');
  }

  return serverMetrics;
}

export async function updateRouteMetric(
  path: string,
  metric: { visits: number; avgTime: number },
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  if (Math.random() < 0.15) {
    throw new Error('Network error: Failed to update route metric');
  }

  serverMetrics[path] = metric;
}
