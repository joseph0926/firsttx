import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const OrderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
});

const OrderSchema = z.object({
  items: z.array(OrderItemSchema),
  total: z.number(),
  discount: z.number(),
  shipping: z.enum(['standard', 'express']),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  lastModified: z.string(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;

export const OrderModel = defineModel('rollback-order', {
  schema: OrderSchema,
  ttl: 5 * 60 * 1000,
  initialData: {
    items: [],
    total: 0,
    discount: 0,
    shipping: 'standard',
    status: 'pending',
    lastModified: new Date().toISOString(),
  },
});
