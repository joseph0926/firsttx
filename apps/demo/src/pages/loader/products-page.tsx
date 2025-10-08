import { useLoaderData, useRevalidator } from 'react-router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { productsApi, type Product } from '@/api/mock-products-api';
import { PerformanceTimer } from '@/components/performance-timer';
import { ProductCard } from '@/components/product-card';
import { benchmarkManager } from '@/lib/benchmark-manager';
import { ProductsGridSkeleton } from '@/components/product-card-skeleton';
import { ButtonWithSpinner } from '@/components/loading-spinner';

type TimerStatus = 'idle' | 'loading' | 'loaded' | 'cached';

let loadStartTime = 0;

export async function productsLoader() {
  loadStartTime = performance.now();
  console.log('[Loader] Fetching from server...');
  const products = await productsApi.getProducts({ network: 'slow' });
  const duration = Math.floor(performance.now() - loadStartTime);
  benchmarkManager.record('loader', duration);
  console.log(`[Loader] Loaded ${products.length} products in ${duration}ms`);
  return { products };
}

export function ProductsPage() {
  const { products } = useLoaderData() as { products: Product[] };
  const revalidator = useRevalidator();
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('loaded');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  const handleTimerComplete = (duration: number) => {
    benchmarkManager.record('loader', duration);
  };

  useEffect(() => {
    if (revalidator.state === 'loading') {
      setTimerStatus('loading');
    } else {
      setTimerStatus('loaded');
    }
  }, [revalidator.state]);

  const handleAddRandomProduct = async () => {
    setIsAddingProduct(true);
    const toastId = toast.loading('Adding new product...');

    try {
      console.log('[Loader] 🎲 Adding random product to server...');
      const newProduct = await productsApi.addRandomProduct();
      console.log(`✅ [Loader] Added: ${newProduct.name}`);

      toast.warning('⚠️ Product added to server', {
        id: toastId,
        description: 'Click "Refresh" to revalidate and see the new product',
        duration: 5000,
      });

      console.log('⚠️ [Loader] Need to revalidate to see new product');
    } catch (err) {
      console.error('❌ [Loader] Failed to add random product:', err);
      toast.error('Failed to add product', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsAddingProduct(false);
    }
  };

  const benchmarkResult = benchmarkManager.getResult('loader');

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products - RR7 Loader</h1>
        <div className="flex items-center gap-4">
          <PerformanceTimer
            approach="loader"
            status={timerStatus}
            onComplete={handleTimerComplete}
          />
          <button
            onClick={handleAddRandomProduct}
            disabled={revalidator.state === 'loading' || isAddingProduct}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ButtonWithSpinner isLoading={isAddingProduct} loadingText="Adding...">
              🎲 Add Random
            </ButtonWithSpinner>
          </button>
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
            <ButtonWithSpinner
              isLoading={revalidator.state === 'loading'}
              loadingText="Refreshing..."
            >
              Refresh
            </ButtonWithSpinner>
          </button>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-green-800 dark:text-green-300">
            Loader data | {products.length} products | API requests: {productsApi.getRequestCount()}
          </p>
          {benchmarkResult && (
            <div className="text-xs text-green-700 dark:text-green-400">
              Avg: {benchmarkResult.average}ms ({benchmarkResult.measurements.length} samples)
            </div>
          )}
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          ⚠️ <strong>SSR-Like Pattern:</strong> Data loaded before page render (fast initial paint),
          but no caching between navigations. New products won't appear until manual revalidation.
        </p>
      </div>

      {revalidator.state === 'loading' && products.length === 0 ? (
        <ProductsGridSkeleton count={12} />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No products available.</p>
      )}
    </div>
  );
}
