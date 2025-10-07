import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const CartSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      qty: z.number(),
    }),
  ),
  updatedAt: z.number(),
});

export const CartModel = defineModel('cart', {
  schema: CartSchema,
  ttl: 5 * 60 * 1000,
  version: 1,
  initialData: { items: [], updatedAt: 0 },
});
