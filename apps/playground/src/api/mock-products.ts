import type { Product } from '@/models/products.model';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `product-${i}`,
    name: `Product ${i}`,
    description: `This is a detailed description for product ${i}. It contains multiple sentences to make the DOM heavier and simulate real-world content. Additional text to increase the payload size.`,
    price: Math.floor(Math.random() * 1000) / 10,
    imageUrl: `https://picsum.photos/seed/${i}/300/200`,
    category: ['Electronics', 'Clothing', 'Food', 'Books', 'Toys'][i % 5],
  }));
}

export async function fetchProducts(): Promise<Product[]> {
  await sleep(randomBetween(500, 1000));

  const count = randomBetween(100, 110);
  return generateMockProducts(count);
}
