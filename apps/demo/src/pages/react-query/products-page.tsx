import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { productsApi } from '@/api/mock-products-api';
import { PerformanceTimer } from '@/components/performance-timer';
import { ProductCard } from '@/components/product-card';
import { benchmarkManager } from '@/lib/benchmark-manager';
import { ProductsGridSkeleton } from '@/components/product-card-skeleton';

type TimerStatus = 'idle' | 'loading' | 'loaded' | 'cached';

export function ProductsPage() {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const handleTimerComplete = (duration: number) => {
    benchmarkManager.record('react-query', duration);
  };
  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      setTimerStatus('loading');
      const data = await productsApi.getProducts({ network: 'slow' });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (!isLoading && products.length > 0) {
      setTimerStatus('loaded');
    }
  }, [isLoading, products.length]);
  const benchmarkResult = benchmarkManager.getResult('react-query');
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products - React Query</h1>
        <div className="flex items-center gap-4">
          <PerformanceTimer
            approach="react-query"
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
            onClick={() => refetch()}
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
            Memory cache | {products.length} products | API requests:{' '}
            {productsApi.getRequestCount()}
          </p>
          {benchmarkResult && (
            <div className="text-xs text-blue-700 dark:text-blue-400">
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
