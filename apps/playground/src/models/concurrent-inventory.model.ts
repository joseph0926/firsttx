import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  stock: z.number(),
  reserved: z.number(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const ConcurrentInventorySchema = z.object({
  items: z.record(InventoryItemSchema),
  lastUpdated: z.number(),
});

export type ConcurrentInventory = z.infer<typeof ConcurrentInventorySchema>;

export const ConcurrentInventoryModel = defineModel('concurrent-inventory', {
  schema: ConcurrentInventorySchema,
  ttl: 10 * 60 * 1000,
  version: 1,
  initialData: {
    items: {
      'item-1': { id: 'item-1', name: 'Widget A', stock: 100, reserved: 0 },
      'item-2': { id: 'item-2', name: 'Widget B', stock: 100, reserved: 0 },
      'item-3': { id: 'item-3', name: 'Widget C', stock: 100, reserved: 0 },
      'item-4': { id: 'item-4', name: 'Widget D', stock: 100, reserved: 0 },
      'item-5': { id: 'item-5', name: 'Widget E', stock: 100, reserved: 0 },
    },
    lastUpdated: Date.now(),
  },
});
