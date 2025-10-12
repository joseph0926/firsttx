import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const DashboardStatsSchema = z.object({
  revenue: z.number(),
  activeUsers: z.number(),
  orders: z.number(),
  conversionRate: z.number(),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const AutoStatsModel = defineModel('dashboard-stats-auto', {
  schema: DashboardStatsSchema,
  ttl: 30 * 1000,
});

export const ManualStatsModel = defineModel('dashboard-stats-manual', {
  schema: DashboardStatsSchema,
  ttl: 30 * 1000,
});
