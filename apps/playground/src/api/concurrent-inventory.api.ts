import { sleep } from '@/lib/utils';
import type { ConcurrentInventory } from '@/models/concurrent-inventory.model';

const API_DELAY_MS = 150;

export async function reserveItem(itemId: string, failureRate: number): Promise<void> {
  await sleep(API_DELAY_MS);

  if (Math.random() * 100 < failureRate) {
    throw new Error(`Failed to reserve ${itemId}: Server error`);
  }

  console.log(`[API] Reserved ${itemId}`);
}

export async function fetchInventory(): Promise<ConcurrentInventory> {
  await sleep(1000);

  return {
    items: {
      'item-1': { id: 'item-1', name: 'Widget A', stock: 100, reserved: 0 },
      'item-2': { id: 'item-2', name: 'Widget B', stock: 100, reserved: 0 },
      'item-3': { id: 'item-3', name: 'Widget C', stock: 100, reserved: 0 },
      'item-4': { id: 'item-4', name: 'Widget D', stock: 100, reserved: 0 },
      'item-5': { id: 'item-5', name: 'Widget E', stock: 100, reserved: 0 },
    },
    lastUpdated: Date.now(),
  };
}
