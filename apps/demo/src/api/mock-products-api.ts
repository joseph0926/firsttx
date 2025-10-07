export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  stock: number;
  rating: number;
  reviewCount: number;
};

export type NetworkCondition = 'fast' | 'slow' | '3g' | 'offline';

export type ApiOptions = {
  network?: NetworkCondition;
  failureRate?: number;
  shouldFail?: boolean;
};

const CATEGORIES = ['Electronics', 'Appliances', 'Fashion', 'Food', 'Books', 'Sports'];
const BRANDS = ['Apple', 'Samsung', 'LG', 'Sony', 'Nike', 'Adidas'];

function generateMockProducts(count = 200): Product[] {
  return Array.from({ length: count }, (_, i) => {
    const category = CATEGORIES[i % CATEGORIES.length];
    const brand = BRANDS[i % BRANDS.length];

    return {
      id: `prod-${i + 1}`,
      name: `${brand} ${category} Product ${i + 1}`,
      price: Math.floor(Math.random() * 2000) + 10,
      category,
      description: `Premium ${category.toLowerCase()} product from ${brand}. Best quality and performance guaranteed.`,
      imageUrl: `https://picsum.photos/seed/${i}/400/400`,
      stock: Math.floor(Math.random() * 100) + 1,
      rating: Math.random() * 2 + 3,
      reviewCount: Math.floor(Math.random() * 500),
    };
  });
}

const MOCK_PRODUCTS = generateMockProducts(200);

const NETWORK_DELAYS: Record<NetworkCondition, number> = {
  fast: 200,
  slow: 2000,
  '3g': 5000,
  offline: 0,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockProductsAPI {
  private requestCount = 0;

  async getProducts(options: ApiOptions = {}): Promise<Product[]> {
    const { network = 'slow', failureRate = 0, shouldFail = false } = options;

    this.requestCount++;
    console.log(`📡 [API] getProducts call #${this.requestCount}`, {
      network,
      failureRate,
      shouldFail,
    });

    if (network === 'offline') {
      throw new Error('NetworkError: Offline');
    }

    if (shouldFail) {
      await delay(500);
      throw new Error('ServerError: Request rejected by server');
    }

    if (Math.random() < failureRate) {
      await delay(1000);
      throw new Error('NetworkError: Temporary network failure');
    }

    const delayMs = NETWORK_DELAYS[network];
    console.log(`⏳ [API] Waiting ${delayMs}ms...`);
    await delay(delayMs);

    console.log(`✅ [API] Returning ${MOCK_PRODUCTS.length} products`);
    return MOCK_PRODUCTS;
  }

  async getProductById(id: string, options: ApiOptions = {}): Promise<Product | null> {
    const { network = 'fast' } = options;

    await delay(NETWORK_DELAYS[network]);
    return MOCK_PRODUCTS.find((p) => p.id === id) ?? null;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  resetRequestCount(): void {
    this.requestCount = 0;
  }
}

export const productsApi = new MockProductsAPI();

if (typeof window !== 'undefined') {
  (window as any).__productsApi = productsApi;
}
