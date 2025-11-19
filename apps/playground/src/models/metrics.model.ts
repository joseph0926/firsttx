import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const ScenarioMetricsSchema = z.object({
  scenarioId: z.string(),
  runId: z.string(),
  metrics: z.record(z.union([z.number(), z.string()])),
  meta: z.record(z.any()).nullable(),
  updatedAt: z.number(),
});

const PlaygroundMetricsSchema = z.object({
  scenarios: z.record(ScenarioMetricsSchema),
});

export type ScenarioMetrics = z.infer<typeof ScenarioMetricsSchema>;
export type PlaygroundMetrics = z.infer<typeof PlaygroundMetricsSchema>;

export const PlaygroundMetricsModel = defineModel('playground-metrics', {
  schema: PlaygroundMetricsSchema,
  ttl: 10 * 60 * 1000,
  initialData: {
    scenarios: {},
  },
});
