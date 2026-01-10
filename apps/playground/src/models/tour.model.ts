import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const TourStateSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
  completedAt: z.number().nullable(),
  skippedAt: z.number().nullable(),
});

export type TourState = z.infer<typeof TourStateSchema>;

export const TourModel = defineModel('tour-state', {
  schema: TourStateSchema,
  ttl: Infinity,
  initialData: {
    status: 'not_started',
    completedAt: null,
    skippedAt: null,
  },
});
