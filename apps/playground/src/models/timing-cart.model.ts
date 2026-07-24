import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const TimingCartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

const TimingCartSchema = z.object({
  items: z.array(TimingCartItemSchema),
  total: z.number(),
  lastModified: z.string(),
});

export type TimingCart = z.infer<typeof TimingCartSchema>;

export type TimingCartResetOperation = 'initialization' | 'run-reset' | 'manual-reset';

interface TimingCartSubscriptionEvent {
  phase: 'setup' | 'cleanup';
  subscriptionId: number;
  activeSubscriptions: number;
}

interface TimingCartSubscriptionWitness {
  events: TimingCartSubscriptionEvent[];
  activeSubscriptions: number;
  deliveredUpdates: number;
  lastDeliveredSubscriptionId: number | null;
}

export const TIMING_INITIAL_CART: TimingCart = {
  items: [
    { id: '1', name: 'Wireless Headphones', price: 79.99, quantity: 1 },
    { id: '2', name: 'USB-C Cable', price: 12.99, quantity: 2 },
  ],
  total: 105.97,
  lastModified: '2026-07-23T00:00:00.000Z',
};

export const TIMING_SERVER_CART: TimingCart = {
  ...TIMING_INITIAL_CART,
  items: TIMING_INITIAL_CART.items.map((item) =>
    item.id === '1' ? { ...item, quantity: 5 } : { ...item },
  ),
  total: 425.93,
  lastModified: '2026-07-23T00:00:01.000Z',
};

export const TIMING_FAILURE_STORAGE_KEY = 'firsttx:timing-fixture-failure';

export const TIMING_FAILURE_MESSAGES: Record<TimingCartResetOperation, string> = {
  initialization: 'Injected initialization reset failure',
  'run-reset': 'Injected pre-run reset failure',
  'manual-reset': 'Injected manual reset failure',
};

export const TimingCartModel = defineModel('sync-timing', {
  schema: TimingCartSchema,
  ttl: 5 * 60 * 1000,
  initialData: TIMING_INITIAL_CART,
});

const timingCartSubscriptionEvents: TimingCartSubscriptionEvent[] = [];
const activeTimingCartSubscriptions = new Set<number>();
let nextTimingCartSubscriptionId = 0;
let deliveredTimingCartUpdates = 0;
let lastDeliveredTimingCartSubscriptionId: number | null = null;

export function subscribeToTimingCart(callback: () => void) {
  const subscriptionId = ++nextTimingCartSubscriptionId;
  const unsubscribe = TimingCartModel.subscribe(() => {
    deliveredTimingCartUpdates += 1;
    lastDeliveredTimingCartSubscriptionId = subscriptionId;
    callback();
  });

  activeTimingCartSubscriptions.add(subscriptionId);
  timingCartSubscriptionEvents.push({
    phase: 'setup',
    subscriptionId,
    activeSubscriptions: activeTimingCartSubscriptions.size,
  });

  return () => {
    unsubscribe();
    activeTimingCartSubscriptions.delete(subscriptionId);
    timingCartSubscriptionEvents.push({
      phase: 'cleanup',
      subscriptionId,
      activeSubscriptions: activeTimingCartSubscriptions.size,
    });
  };
}

export function getTimingCartSubscriptionWitness(): TimingCartSubscriptionWitness {
  return {
    events: timingCartSubscriptionEvents.map((event) => ({ ...event })),
    activeSubscriptions: activeTimingCartSubscriptions.size,
    deliveredUpdates: deliveredTimingCartUpdates,
    lastDeliveredSubscriptionId: lastDeliveredTimingCartSubscriptionId,
  };
}

export async function replaceTimingCartFixture(
  cart: TimingCart,
  operation: TimingCartResetOperation,
) {
  if (sessionStorage.getItem(TIMING_FAILURE_STORAGE_KEY) === operation) {
    throw new Error(TIMING_FAILURE_MESSAGES[operation]);
  }

  await TimingCartModel.replace(cart);
}
