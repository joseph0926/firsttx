import { randomBetween, sleep } from '@/lib/utils';
import type { DashboardStats } from '../models/dashboard-stats.model';

const MOCK_DELAY = 1200;

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await sleep(MOCK_DELAY);

  if (Math.random() < 0.1) {
    throw new Error('Network error: Failed to fetch dashboard stats');
  }

  return {
    revenue: randomBetween(15000, 25000),
    activeUsers: randomBetween(150, 350),
    orders: randomBetween(80, 150),
    conversionRate: Math.random() * 5 + 2,
  };
}
