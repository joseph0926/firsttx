import { useModel } from '@firsttx/local-first';
import { useEffect, useState, useRef, useCallback } from 'react';
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

  const loadProducts = useCallback(
    async (force = false, isBackground = false) => {
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
        toast.error('Failed to load products', { description: message });
      } finally {
        setIsLoading(false);
        setIsRevalidating(false);
      }
    },
    [isLoading, products, patchProducts],
  );

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
              const existing = draft.items.find((item) => item.id === product.id);
              if (existing) {
                existing.qty -= 1;
                if (existing.qty <= 0) {
                  draft.items = draft.items.filter((item) => item.id !== product.id);
                }
              }
            });
          },
        },
      );

      await tx.run(
        async () => {
          const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product.id }),
          });
          if (!response.ok) throw new Error('Failed to add to cart');
        },
        { retry: { maxAttempts: 3 } },
      );

      await tx.commit();
      toast.success('Added to cart');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add to cart');
    }
  };

  const handleAddRandomProduct = async () => {
    setIsAddingProduct(true);
    const toastId = toast.loading('Adding new product...');

    try {
      console.log('[FirstTx] 🎲 Adding random product to server...');
      const newProduct = await productsApi.addRandomProduct();
      console.log(`✅ [FirstTx] Added: ${newProduct.name}`);

      toast.success('Product added', {
        id: toastId,
        description: `${newProduct.name} - Revalidating in background...`,
        duration: 3000,
      });

      await loadProducts(true, true);
    } catch (err) {
      console.error('❌ [FirstTx] Failed to add random product:', err);
      toast.error('Failed to add product', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsAddingProduct(false);
    }
  };

  useEffect(() => {
    if (hasInitialLoad.current) return;
    hasInitialLoad.current = true;

    const hasCache = products && products.items.length > 0;
    if (hasCache) {
      setTimerStatus('cached');
      loadProducts(false, true);
    } else {
      loadProducts();
    }
  }, [loadProducts, products]);

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
          <button
            onClick={handleAddRandomProduct}
            disabled={isLoading || isRevalidating || isAddingProduct}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ButtonWithSpinner isLoading={isAddingProduct} loadingText="Adding...">
              🎲 Add Random
            </ButtonWithSpinner>
          </button>
          <button
            onClick={() => window.location.reload()}
            disabled={isLoading || isRevalidating}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            ReLoad
          </button>
          <button
            onClick={() => loadProducts(true)}
            disabled={isLoading || isRevalidating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <ButtonWithSpinner isLoading={isLoading || isRevalidating} loadingText="Refreshing...">
              Refresh
            </ButtonWithSpinner>
          </button>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-green-800 dark:text-green-300">
            {history.isStale ? (
              <>⚠️ Stale data ({Math.floor(history.age / 1000)}s old) | Syncing in background...</>
            ) : (
              <>
                ✅ Fresh data | {products?.items.length || 0} products | API requests:{' '}
                {productsApi.getRequestCount()}
              </>
            )}
          </p>
          {benchmarkResult && (
            <div className="text-xs text-green-700 dark:text-green-400">
              Avg: {benchmarkResult.average}ms ({benchmarkResult.measurements.length} samples)
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>Auto-Sync Strategy:</strong> New products appear automatically via background
          revalidation. No manual refresh needed!
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 dark:text-red-300">❌ Error: {error}</p>
        </div>
      )}

      {isLoading && !products ? (
        <ProductsGridSkeleton count={12} />
      ) : products && products.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.items.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              createdAt={product.createdAt}
              onAddToCart={() => handleAddToCart(product)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No products found</div>
      )}
    </div>
  );
}
