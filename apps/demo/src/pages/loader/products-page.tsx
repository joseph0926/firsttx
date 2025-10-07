import { useLoaderData, useRevalidator } from 'react-router';
import { useState, useEffect } from 'react';
import { productsApi, type Product } from '@/api/mock-products-api';
import { PerformanceTimer } from '@/components/performance-timer';
import { ProductCard } from '@/components/product-card';
import { benchmarkManager } from '@/lib/benchmark-manager';
import { ProductsGridSkeleton } from '@/components/product-card-skeleton';

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
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-green-800 dark:text-green-300">
            Loader-based | {products.length} products | API requests:{' '}
            {productsApi.getRequestCount()}
          </p>
          {benchmarkResult && (
            <div className="text-xs text-green-700 dark:text-green-400">
              Avg: {benchmarkResult.average}ms ({benchmarkResult.measurements.length} samples)
            </div>
          )}
        </div>
      </div>
      {revalidator.state === 'loading' && products.length === 0 ? (
        <ProductsGridSkeleton count={12} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} cartDisabled />
          ))}
        </div>
      )}
    </div>
  );
}
