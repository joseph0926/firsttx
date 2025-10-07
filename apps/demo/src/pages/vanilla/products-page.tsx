import { useEffect, useState } from 'react';
import { productsApi, type Product } from '../../api/mock-products-api';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[Vanilla] Fetching from server...');
      const data = await productsApi.getProducts({ network: 'slow' });
      setProducts(data);
      console.log(`[Vanilla] Loaded ${data.length} products`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[Vanilla] Load failed:', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Products - Vanilla</h1>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="bg-gray-300 h-48 mb-4 rounded"></div>
              <div className="bg-gray-300 h-4 mb-2 rounded"></div>
              <div className="bg-gray-300 h-4 w-2/3 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products - Vanilla</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            disabled={isLoading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            ReLoad
          </button>
          <button
            onClick={loadProducts}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-800">
          No cache | Total {products.length} products | API requests:{' '}
          {productsApi.getRequestCount()}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-48 object-cover rounded mb-4"
            />
            <h3 className="font-semibold mb-2 truncate">{product.name}</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-500">★</span>
              <span className="text-sm text-gray-600">
                {product.rating.toFixed(1)} ({product.reviewCount})
              </span>
            </div>
            <p className="text-lg font-bold text-blue-600 mb-2">
              ${product.price.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mb-3">Stock: {product.stock}</p>
            <button className="w-full bg-gray-400 text-white py-2 rounded cursor-not-allowed">
              Cart not implemented
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
