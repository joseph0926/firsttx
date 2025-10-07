import { useLoaderData, useRevalidator } from 'react-router';
import { productsApi, type Product } from '../../api/mock-products-api';

export async function productsLoader() {
  console.log('[Loader] Fetching from server...');
  const products = await productsApi.getProducts({ network: 'slow' });
  console.log(`[Loader] Loaded ${products.length} products`);
  return { products };
}

export function ProductsPage() {
  const { products } = useLoaderData() as { products: Product[] };
  const revalidator = useRevalidator();

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products - RR7 Loader</h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            disabled={revalidator.state === 'loading'}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            ReLoad
          </button>
          <button
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === 'loading'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {revalidator.state === 'loading' ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          Loader-based | Total {products.length} products | API requests:{' '}
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
