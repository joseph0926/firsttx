import { useState, useEffect } from 'react';
import { productsApi, type Product } from '@/api/mock-products-api';
import { PerformanceTimer } from '@/components/performance-timer';
import { ProductCard } from '@/components/product-card';
import { benchmarkManager } from '@/lib/benchmark-manager';
import { ProductsGridSkeleton } from '@/components/product-card-skeleton';

type TimerStatus = 'idle' | 'loading' | 'loaded' | 'cached';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const handleTimerComplete = (duration: number) => {
    benchmarkManager.record('vanilla', duration);
  };
  const loadProducts = async () => {
    setIsLoading(true);
    setTimerStatus('loading');
    try {
      const data = await productsApi.getProducts({ network: 'slow' });
      setProducts(data);
      setTimerStatus('loaded');
    } catch (err) {
      console.error('Failed to load products:', err);
      setTimerStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadProducts();
  }, []);
  const benchmarkResult = benchmarkManager.getResult('vanilla');
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products - Vanilla</h1>
        <div className="flex items-center gap-4">
          <PerformanceTimer
            approach="vanilla"
            status={timerStatus}
            onComplete={handleTimerComplete}
          />
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
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-800 dark:text-gray-300">
            No cache | {products.length} products | API requests: {productsApi.getRequestCount()}
          </p>
          {benchmarkResult && (
            <div className="text-xs text-gray-700 dark:text-gray-400">
              Avg: {benchmarkResult.average}ms ({benchmarkResult.measurements.length} samples)
            </div>
          )}
        </div>
      </div>
      {isLoading && products.length === 0 ? (
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
