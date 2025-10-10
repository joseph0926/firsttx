import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  imageUrl: z.string(),
  category: z.string(),
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductsModel = defineModel('heavy-products', {
  schema: z.object({
    items: z.array(ProductSchema),
    lastFetch: z.number(),
  }),
  ttl: 10 * 60 * 1000,
});
