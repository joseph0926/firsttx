import type { Product } from '../models/product.model';

let serverState: Product = {
  id: 'prod-001',
  productName: 'Laptop Pro',
  quantity: 10,
  price: 1199,
  lastModified: new Date(Date.now() - 10000).toISOString(),
  version: 1,
};

export async function fetchProduct(): Promise<Product> {
  await sleep(200 + Math.random() * 100);
  return { ...serverState };
}

export async function updateProduct(product: Product): Promise<Product> {
  await sleep(300 + Math.random() * 200);

  if (product.version !== serverState.version) {
    throw new ConflictError('Version mismatch', serverState);
  }

  serverState = {
    ...product,
    lastModified: new Date().toISOString(),
    version: product.version + 1,
  };

  return { ...serverState };
}

export function simulateServerChange(changes: Partial<Omit<Product, 'id' | 'version'>>) {
  serverState = {
    ...serverState,
    ...changes,
    lastModified: new Date().toISOString(),
    version: serverState.version + 1,
  };
}

export function getServerState(): Product {
  return { ...serverState };
}

export class ConflictError extends Error {
  constructor(
    message: string,
    // @ts-expect-error no type
    public serverState: Product,
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
