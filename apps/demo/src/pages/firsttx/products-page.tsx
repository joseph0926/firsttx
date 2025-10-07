import { useModel } from '@firsttx/local-first';
import { useEffect, useState, useRef } from 'react';
import { startTransaction } from '@firsttx/tx';
import { ProductsModel } from '@/models/products-model';
import { CartModel } from '@/models/cart-model';
import { productsApi, type Product } from '@/api/mock-products-api';
import { PerformanceTimer } from '@/components/performance-timer';
import { ProductCard } from '@/components/product-card';
import { benchmarkManager } from '@/lib/benchmark-manager';
import { ProductsGridSkeleton } from '@/components/product-card-skeleton';

type TimerStatus = 'idle' | 'loading' | 'loaded' | 'cached';

export function ProductsPage() {
  const [products, patchProducts, history] = useModel(ProductsModel);
  const [, patchCart] = useModel(CartModel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const handleTimerComplete = (duration: number) => {
    benchmarkManager.record('firsttx', duration);
  };
  const loadProducts = async (force = false) => {
    if (isLoading) return;
    const hasCache = products && products.items.length > 0;
    if (!force && hasCache) {
      console.log('[ProductsPage] Using cached data');
      setTimerStatus('cached');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTimerStatus('loading');
    try {
      console.log('[ProductsPage] Fetching from server...');
      const serverProducts = await productsApi.getProducts({ network: 'slow' });
      if (document.startViewTransition && hasCache) {
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
      setTimerStatus('loaded');
      console.log(`✅ [ProductsPage] Loaded ${serverProducts.length} products`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setTimerStatus('idle');
      console.error('❌ [ProductsPage] Load failed:', message);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (products && products.items.length > 0) {
      setTimerStatus('cached');
    } else {
      loadProducts();
    }
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
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">
            Error Occurred
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
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
  const ageInSeconds = products ? Math.floor((Date.now() - products.lastSync) / 1000) : 0;
  const isStale = history.isStale;
  const benchmarkResult = benchmarkManager.getResult('firsttx');
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products - FirstTx</h1>
        <div className="flex items-center gap-4">
          <PerformanceTimer
            approach="firsttx"
            status={timerStatus}
            onComplete={handleTimerComplete}
          />
          {isStale && (
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full text-sm">
              {ageInSeconds < 60 ? `${ageInSeconds}s ago` : `${Math.floor(ageInSeconds / 60)}m ago`}
            </span>
          )}
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
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            IndexedDB Cache | {products ? `${products.totalCount} products` : 'Loading...'} | API
            requests: {productsApi.getRequestCount()}
          </p>
          {benchmarkResult && (
            <div className="text-xs text-blue-700 dark:text-blue-400">
              Avg: {benchmarkResult.average}ms ({benchmarkResult.measurements.length} samples)
            </div>
          )}
        </div>
      </div>
      {isLoading && (!products || products.items.length === 0) ? (
        <ProductsGridSkeleton count={12} />
      ) : products && products.items.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {products.items.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onAddToCart={() => handleAddToCart(product)}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No products available.</p>
      )}
    </div>
  );
}
