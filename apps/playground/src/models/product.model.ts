import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(0),
  price: z.number().min(0),
  lastModified: z.string(),
  version: z.number().int().default(1),
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductModel = defineModel('conflict-product', {
  schema: ProductSchema,
  ttl: 5 * 60 * 1000,
});
