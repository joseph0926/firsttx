import { useModel } from '@firsttx/local-first';
import { useEffect, useState } from 'react';
import { startTransaction } from '@firsttx/tx';
import { ProductsModel } from '@/models/products-model';
import { CartModel } from '@/models/cart-model';
import { productsApi, type Product } from '@/api/mock-products-api';

export function ProductsPage() {
  const [products, patchProducts, history] = useModel(ProductsModel);
  const [, patchCart] = useModel(CartModel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async (force = false) => {
    if (isLoading) return;

    if (!force && products && products.items.length > 0) {
      console.log('[ProductsPage] Using cached data');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[ProductsPage] Fetching from server...');
      const serverProducts = await productsApi.getProducts({ network: 'slow' });

      if (document.startViewTransition && products && products.items.length > 0) {
        await document.startViewTransition(async () => {
          await patchProducts((draft) => {
            draft.items = serverProducts;
            draft.lastSync = Date.now();
            draft.totalCount = serverProducts.length;
          });
        }).finished;
      } else {
        await patchProducts((draft) => {
          draft.items = serverProducts;
          draft.lastSync = Date.now();
          draft.totalCount = serverProducts.length;
        });
      }

      console.log(`✅ [ProductsPage] Loaded ${serverProducts.length} products`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('❌ [ProductsPage] Load failed:', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    const tx = startTransaction({ transition: true });

    try {
      await tx.run(
        async () => {
          await patchCart((draft) => {
            const existing = draft.items.find((item) => item.id === product.id);
            if (existing) {
              existing.qty += 1;
            } else {
              draft.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                qty: 1,
              });
            }
            draft.updatedAt = Date.now();
          });
        },
        {
          compensate: async () => {
            await patchCart((draft) => {
              const item = draft.items.find((i) => i.id === product.id);
              if (item) {
                item.qty -= 1;
                if (item.qty <= 0) {
                  draft.items = draft.items.filter((i) => i.id !== product.id);
                }
              }
            });
          },
        },
      );

      await tx.commit();
      console.log('✅ [ProductsPage] Added to cart successfully');
    } catch (err) {
      console.error('❌ [ProductsPage] Failed to add to cart:', err);
    }
  };

  if (isLoading && (!products || products.items.length === 0)) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Products</h1>
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
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Occurred</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadProducts(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!products || products.items.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <p className="text-gray-500">No products available.</p>
      </div>
    );
  }

  const ageInSeconds = Math.floor((Date.now() - products.lastSync) / 1000);
  const isStale = history.isStale;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex items-center gap-4">
          {isStale && (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
              {ageInSeconds < 60 ? `${ageInSeconds}s ago` : `${Math.floor(ageInSeconds / 60)}m ago`}
            </span>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.reload()}
              disabled={isLoading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              ReLoad
            </button>
            <button
              onClick={() => loadProducts(true)}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Loaded from IndexedDB | Total {products.totalCount} products | API requests:{' '}
          {productsApi.getRequestCount()}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {products.items.map((product) => (
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
            <button
              onClick={() => handleAddToCart(product)}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
