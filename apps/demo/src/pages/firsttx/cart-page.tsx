import { useModel } from '@firsttx/local-first';
import { startTransaction } from '@firsttx/tx';
import { cartApi } from '@/api/mock-cart-api';
import { CartModel } from '@/models/cart-model';

const MOCK_PRODUCTS = [
  { id: '1', name: 'MacBook Pro 16"', price: 2500000 },
  { id: '2', name: 'iPhone 15 Pro', price: 1200000 },
  { id: '3', name: 'AirPods Pro', price: 350000 },
];

export function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  const handleAddItem = async (product: (typeof MOCK_PRODUCTS)[0]) => {
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
          },
        },
      );

      await tx.run(
        async () => {
          await cartApi.addItem(product.id);
        },
        { retry: { maxAttempts: 3 } },
      );

      await tx.commit();
    } catch (error) {
      console.error('❌ [TX FAILED]', error);
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

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <div className="mb-8 space-y-2">
        <h2 className="text-xl font-semibold mb-3">Add Products</h2>
        {MOCK_PRODUCTS.map((product) => (
          <button
            key={product.id}
            onClick={() => handleAddItem(product)}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 flex justify-between items-center"
          >
            <span>{product.name}</span>
            <span>{product.price.toLocaleString()}원</span>
          </button>
        ))}
      </div>
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Cart Items</h2>
        {!cart || cart.items.length === 0 ? (
          <p className="text-gray-500">Cart is Empty,,,</p>
        ) : (
          <>
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.price.toLocaleString()}원</div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDecreaseQty(item.id)}
                      className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-semibold min-w-[2rem] text-center">{item.qty}</span>
                    <button
                      onClick={() => handleIncreaseQty(item.id)}
                      className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="ml-auto font-semibold">
                      {(item.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-gray-300">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Amount:</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
            </div>
          </>
        )}
      </div>
      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-gray-600">Debug Info</summary>
        <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
          {JSON.stringify({ cart, history }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
