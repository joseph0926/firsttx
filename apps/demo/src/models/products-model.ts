import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  stock: z.number(),
  rating: z.number(),
  reviewCount: z.number(),
});

const ProductsDataSchema = z.object({
  items: z.array(ProductSchema),
  lastSync: z.number(),
  totalCount: z.number(),
});

export type ProductsData = z.infer<typeof ProductsDataSchema>;

export const ProductsModel = defineModel('products', {
  schema: ProductsDataSchema,
  version: 1,
  initialData: {
    items: [],
    lastSync: 0,
    totalCount: 0,
  },
  ttl: 5 * 60 * 1000,
});
