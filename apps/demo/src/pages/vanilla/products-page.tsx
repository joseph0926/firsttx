import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { productsApi, type Product } from '@/api/mock-products-api';
import { PerformanceTimer } from '@/components/performance-timer';
import { ProductCard } from '@/components/product-card';
import { benchmarkManager } from '@/lib/benchmark-manager';
import { ProductsGridSkeleton } from '@/components/product-card-skeleton';
import { ButtonWithSpinner } from '@/components/loading-spinner';

type TimerStatus = 'idle' | 'loading' | 'loaded' | 'cached';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
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
      toast.error('Failed to load products', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRandomProduct = async () => {
    setIsAddingProduct(true);
    const toastId = toast.loading('Adding new product...');

    try {
      console.log('[Vanilla] 🎲 Adding random product to server...');
      const newProduct = await productsApi.addRandomProduct();
      console.log(`✅ [Vanilla] Added: ${newProduct.name}`);

      toast.warning('⚠️ Product added to server', {
        id: toastId,
        description: 'Click "Refresh" to see the new product',
        duration: 5000,
      });

      console.log('⚠️ [Vanilla] New product added but UI not updated - need manual refresh!');
    } catch (err) {
      console.error('❌ [Vanilla] Failed to add random product:', err);
      toast.error('Failed to add product', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsAddingProduct(false);
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
            onClick={handleAddRandomProduct}
            disabled={isLoading || isAddingProduct}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ButtonWithSpinner isLoading={isAddingProduct} loadingText="Adding...">
              🎲 Add Random
            </ButtonWithSpinner>
          </button>
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
            <ButtonWithSpinner isLoading={isLoading} loadingText="Refreshing...">
              Refresh
            </ButtonWithSpinner>
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

      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          ⚠️ <strong>No Sync Strategy:</strong> If you add a random product, it won't appear until
          you manually click "Refresh". This is the default behavior without caching.
        </p>
      </div>

      {isLoading && products.length === 0 ? (
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
