import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/mock-products-api';

export function ProductsPage() {
  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      console.log('[React Query] Fetching from server...');
      const data = await productsApi.getProducts({ network: 'slow' });
      console.log(`[React Query] Loaded ${data.length} products`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Products - React Query</h1>
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
          <p className="text-red-600 mb-4">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!products) return null;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products - React Query</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            ReLoad
          </button>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Memory cache | Total {products.length} products | API requests:{' '}
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
