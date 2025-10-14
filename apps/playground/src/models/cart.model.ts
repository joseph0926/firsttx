import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  imageUrl: z.string(),
});

const CartSchema = z.object({
  items: z.array(CartItemSchema),
  total: z.number(),
  lastModified: z.string(),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;

export const CartModel = defineModel('instant-cart', {
  schema: CartSchema,
  ttl: 5 * 60 * 1000,
  initialData: {
    items: [],
    total: 0,
    lastModified: new Date().toISOString(),
  },
});
