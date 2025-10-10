import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const RouteMetricSchema = z.object({
  visits: z.number(),
  avgTime: z.number(),
});

export type RouteMetric = z.infer<typeof RouteMetricSchema>;

const RouteMetricsDataSchema = z.record(z.string(), RouteMetricSchema);

export type RouteMetricsData = z.infer<typeof RouteMetricsDataSchema>;

export const RouteMetricsModel = defineModel('route-metrics', {
  schema: RouteMetricsDataSchema,
  ttl: 7 * 24 * 60 * 60 * 1000,
  initialData: {},
});
