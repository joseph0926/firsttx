import { useModel } from '@firsttx/local-first';
import { useEffect, useState, useRef } from 'react';
import { startTransaction } from '@firsttx/tx';
import { toast } from 'sonner';
import { ProductsModel } from '@/models/products-model';
import { CartModel } from '@/models/cart-model';
import { productsApi, type Product } from '@/api/mock-products-api';
import { PerformanceTimer } from '@/components/performance-timer';
import { ProductCard } from '@/components/product-card';
import { benchmarkManager } from '@/lib/benchmark-manager';
import { ProductsGridSkeleton } from '@/components/product-card-skeleton';
import { ButtonWithSpinner } from '@/components/loading-spinner';

type TimerStatus = 'idle' | 'loading' | 'loaded' | 'cached';

export function ProductsPage() {
  const [products, patchProducts, history] = useModel(ProductsModel);
  const [, patchCart] = useModel(CartModel);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const hasInitialLoad = useRef(false);

  const handleTimerComplete = (duration: number) => {
    benchmarkManager.record('firsttx', duration);
  };

  const loadProducts = async (force = false, isBackground = false) => {
    if (isLoading) return;
    const hasCache = products && products.items.length > 0;
    if (!force && hasCache) {
      console.log('[ProductsPage] Using cached data');
      setTimerStatus('cached');
      return;
    }

    if (isBackground) {
      setIsRevalidating(true);
    } else {
      setIsLoading(true);
      setTimerStatus('loading');
    }

    setError(null);

    try {
      console.log(
        `[ProductsPage] ${isBackground ? 'Background revalidating' : 'Fetching from server'}...`,
      );
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
      console.log(
        `✅ [ProductsPage] ${isBackground ? 'Revalidated' : 'Loaded'} ${serverProducts.length} products`,
      );

      if (isBackground) {
        toast.success('Products updated', {
          description: `${serverProducts.length} products available`,
          duration: 2000,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setTimerStatus('idle');
      console.error('❌ [ProductsPage] Load failed:', message);

      toast.error('Failed to load products', {
        description: message,
      });
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    if (hasInitialLoad.current) return;

    if (products === null) {
      console.log('[ProductsPage] ⏳ Waiting for IndexedDB...');
      return;
    }

    hasInitialLoad.current = true;

    if (products.items.length > 0) {
      setTimerStatus('cached');
      const ageMs = Date.now() - products.lastSync;
      const ageSec = Math.floor(ageMs / 1000);
      console.log(`[ProductsPage] ⚡ Instant Replay from IndexedDB (${ageSec}s old)`);
      benchmarkManager.record('firsttx', 0);

      setTimeout(() => {
        console.log('[ProductsPage] 🔄 Starting background revalidation...');
        loadProducts(true, true);
      }, 100);
    } else {
      console.log('[ProductsPage] 🆕 First visit - loading from server');
      loadProducts();
    }
  }, [products]);

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

      toast.success('Added to cart', {
        description: product.name,
        duration: 2000,
      });
    } catch (err) {
      console.error('❌ [ProductsPage] Failed to add to cart:', err);
      toast.error('Failed to add to cart');
    }
  };

  const handleAddRandomProduct = async () => {
    setIsAddingProduct(true);
    const toastId = toast.loading('Adding new product...');

    try {
      console.log('[ProductsPage] 🎲 Adding random product to server...');
      const newProduct = await productsApi.addRandomProduct();
      console.log(`✅ [ProductsPage] Added: ${newProduct.name}`);

      toast.success('🎉 New product added!', {
        id: toastId,
        description: newProduct.name,
        duration: 3000,
      });

      await loadProducts(true);
    } catch (err) {
      console.error('❌ [ProductsPage] Failed to add random product:', err);
      toast.error('Failed to add product', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsAddingProduct(false);
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
          {isRevalidating && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-800 dark:border-blue-300"></div>
              Revalidating...
            </span>
          )}
          {isStale && (
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full text-sm">
              {ageInSeconds < 60 ? `${ageInSeconds}s ago` : `${Math.floor(ageInSeconds / 60)}m ago`}
            </span>
          )}
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
            onClick={() => loadProducts(true)}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <ButtonWithSpinner isLoading={isLoading} loadingText="Refreshing...">
              Refresh
            </ButtonWithSpinner>
          </button>
        </div>
      </div>

      {timerStatus === 'cached' && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">⚡</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-1">
                Instant Replay
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                Restored from IndexedDB in <span className="font-mono font-bold">0ms</span> · Last
                synced{' '}
                {ageInSeconds < 60
                  ? `${ageInSeconds} seconds`
                  : `${Math.floor(ageInSeconds / 60)} minutes`}{' '}
                ago · {isRevalidating ? '🔄 Checking server for updates...' : '✅ Up to date'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-green-600 dark:text-green-400">
                0ms
              </div>
              <div className="text-xs text-green-600 dark:text-green-500">load time</div>
            </div>
          </div>
        </div>
      )}

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
