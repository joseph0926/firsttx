import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const PrepaintMetricsSchema = z.object({
  lastHandoffStrategy: z.enum(['has-prepaint', 'cold-start']).nullable(),
  lastHandoffAt: z.number().nullable(),
  handoffCounts: z.object({
    'has-prepaint': z.number(),
    'cold-start': z.number(),
  }),
  lastCaptureRoute: z.string().nullable(),
  lastCaptureAt: z.number().nullable(),
  lastCaptureDuration: z.number().nullable(),
  captureCount: z.number(),
});

export type PrepaintMetrics = z.infer<typeof PrepaintMetricsSchema>;

export const PrepaintMetricsModel = defineModel('prepaint-metrics', {
  schema: PrepaintMetricsSchema,
  ttl: 24 * 60 * 60 * 1000,
  initialData: {
    lastHandoffStrategy: null,
    lastHandoffAt: null,
    handoffCounts: {
      'has-prepaint': 0,
      'cold-start': 0,
    },
    lastCaptureRoute: null,
    lastCaptureAt: null,
    lastCaptureDuration: null,
    captureCount: 0,
  },
});
