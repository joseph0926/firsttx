import { useModel } from '@firsttx/local-first';
import { startTransaction } from '@firsttx/tx';
import { useEffect, useRef, useState } from 'react';
import { cartApi } from '@/api/mock-cart-api';
import { CartModel } from '@/models/cart-model';

const MOCK_PRODUCTS = [
  { id: '1', name: 'MacBook Pro 16"', price: 2500000 },
  { id: '2', name: 'iPhone 15 Pro', price: 1200000 },
  { id: '3', name: 'AirPods Pro', price: 350000 },
];

type TimerStatus = 'idle' | 'cached';

export function CartPage() {
  const [cart, patch, history] = useModel(CartModel);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [errorMode, setErrorMode] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const hasInitialLoad = useRef(false);

  useEffect(() => {
    if (hasInitialLoad.current) return;

    if (cart === null) {
      console.log('[CartPage] ⏳ Waiting for IndexedDB...');
      return;
    }

    hasInitialLoad.current = true;

    if (cart.items.length > 0) {
      setTimerStatus('cached');
      const ageMs = Date.now() - cart.updatedAt;
      const ageSec = Math.floor(ageMs / 1000);
      console.log(`[CartPage] ⚡ Instant Replay from IndexedDB (${ageSec}s old)`);
    } else {
      console.log('[CartPage] 🛒 Empty cart');
    }
  }, [cart]);

  const handleAddItem = async (product: (typeof MOCK_PRODUCTS)[0]) => {
    setLastError(null);
    const tx = startTransaction({ transition: true });

    try {
      await tx.run(
        async () => {
          await patch((draft) => {
            const existing = draft.items.find((item) => item.id === product.id);
            if (existing) {
              existing.qty += 1;
            } else {
              draft.items.push({ ...product, qty: 1 });
            }
            draft.updatedAt = Date.now();
          });
          console.log(`✅ [TX Step 1] Optimistic update: +1 ${product.name}`);
        },
        {
          compensate: async () => {
            await patch((draft) => {
              const item = draft.items.find((i) => i.id === product.id);
              if (item) {
                item.qty -= 1;
                if (item.qty <= 0) {
                  draft.items = draft.items.filter((i) => i.id !== product.id);
                }
              }
            });
            console.log(`🔄 [TX Compensate] Rollback: -1 ${product.name}`);
          },
        },
      );

      await tx.run(
        async () => {
          if (errorMode) {
            console.log('❌ [TX Step 2] Error Mode: Throwing simulated error');
            throw new Error('Simulated server error');
          }
          await cartApi.addItem(product.id);
          console.log(`✅ [TX Step 2] Server confirmed: ${product.name}`);
        },
        { retry: { maxAttempts: errorMode ? 0 : 3 } },
      );

      await tx.commit();
      console.log('✅ [TX Commit] Transaction completed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastError(message);
      console.error('❌ [TX FAILED] Automatic rollback triggered:', message);
    }
  };

  const handleIncreaseQty = async (itemId: string) => {
    await patch((draft) => {
      const item = draft.items.find((i) => i.id === itemId);
      if (item) {
        item.qty += 1;
      }
      draft.updatedAt = Date.now();
    });
  };

  const handleDecreaseQty = async (itemId: string) => {
    await patch((draft) => {
      const item = draft.items.find((i) => i.id === itemId);
      if (item) {
        if (item.qty > 1) {
          item.qty -= 1;
        } else {
          draft.items = draft.items.filter((i) => i.id !== itemId);
        }
      }
      draft.updatedAt = Date.now();
    });
  };

  const handleRemoveItem = async (itemId: string) => {
    await patch((draft) => {
      draft.items = draft.items.filter((i) => i.id !== itemId);
      draft.updatedAt = Date.now();
    });
  };

  const totalAmount = cart?.items.reduce((sum, item) => sum + item.price * item.qty, 0) ?? 0;
  const totalItems = cart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;
  // eslint-disable-next-line
  const ageInSeconds = cart ? Math.floor((Date.now() - cart.updatedAt) / 1000) : 0;
  const isStale = history.isStale;

  if (!cart) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading cart...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cart - FirstTx</h1>
        <div className="flex items-center gap-4">
          {isStale && (
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full text-sm">
              {ageInSeconds < 60
                ? `${ageInSeconds}s ago`
                : ageInSeconds < 3600
                  ? `${Math.floor(ageInSeconds / 60)}m ago`
                  : `${Math.floor(ageInSeconds / 3600)}h ago`}
            </span>
          )}
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            ReLoad
          </button>
        </div>
      </div>

      {timerStatus === 'cached' && cart.items.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">⚡</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-1">
                Instant Replay - Your Cart is Ready
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                Restored {totalItems} item{totalItems > 1 ? 's' : ''} from IndexedDB in{' '}
                <span className="font-mono font-bold">0ms</span> · Last updated{' '}
                {ageInSeconds < 60
                  ? `${ageInSeconds} seconds`
                  : ageInSeconds < 3600
                    ? `${Math.floor(ageInSeconds / 60)} minutes`
                    : `${Math.floor(ageInSeconds / 3600)} hours`}{' '}
                ago
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

      {lastError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🔄</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-800 dark:text-red-300 mb-1">
                Atomic Rollback Triggered
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">
                Server error: "{lastError}" · Transaction automatically rolled back with
                ViewTransition
              </p>
            </div>
            <button
              onClick={() => setLastError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500 dark:border-purple-600 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🧪</div>
            <div>
              <h3 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-1">
                Error Simulation Mode
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                {errorMode
                  ? 'All "Add to Cart" requests will fail - watch the atomic rollback!'
                  : 'Toggle to simulate server errors and test rollback behavior'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={errorMode}
              onChange={(e) => setErrorMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Add Products
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {MOCK_PRODUCTS.map((product) => {
                const inCart = cart.items.find((item) => item.id === product.id);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ₩{product.price.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddItem(product)}
                      className={`px-4 py-2 rounded font-medium ${
                        errorMode
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {errorMode
                        ? '❌ Add (will fail)'
                        : inCart
                          ? `+1 (${inCart.qty})`
                          : 'Add to Cart'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Cart Items ({totalItems})
            </h2>
            {cart.items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Your cart is empty</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {errorMode
                    ? '🧪 Error mode is ON - try adding items to see rollback!'
                    : 'Add products to see Instant Replay in action'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ₩{item.price.toLocaleString()} × {item.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecreaseQty(item.id)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => handleIncreaseQty(item.id)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 sticky top-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Items</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total</span>
                <span>₩{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                <span>Total</span>
                <span>₩{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <button
              disabled={cart.items.length === 0}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Checkout
            </button>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                💡 Try this:{' '}
                {errorMode
                  ? 'Add items with Error Mode ON to see atomic rollback!'
                  : 'Add items, then click "ReLoad". Your cart persists instantly!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
