import { useState, useEffect } from 'react';
import { Clock, Zap, RefreshCw, Loader2 } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel, type Cart, type CartItem } from '@/models/cart.model';
import { fetchCart, updateCartItem } from '@/api/cart.api';
import { sleep } from '@/lib/utils';

export default function InstantCart() {
  const { data: firstTxCart, patch, isSyncing } = useSyncedModel(CartModel, fetchCart);

  const [traditionalCart, setTraditionalCart] = useState<Cart | null>(null);
  const [traditionalLoading, setTraditionalLoading] = useState(false);
  const [traditionalUpdating, setTraditionalUpdating] = useState(false);

  const [firstTxResponseTime, setFirstTxResponseTime] = useState(0);
  const [traditionalResponseTime, setTraditionalResponseTime] = useState(0);
  const [actionLatency, setActionLatency] = useState({ firstTx: 0, traditional: 0 });

  const loadTraditionalCart = async () => {
    const start = performance.now();
    setTraditionalLoading(true);

    try {
      const cart = await fetchCart();
      setTraditionalCart(cart);
      const end = performance.now();
      setTraditionalResponseTime(end - start);
    } finally {
      setTraditionalLoading(false);
    }
  };

  useEffect(() => {
    if (firstTxCart) {
      setFirstTxResponseTime(0);
    }
  }, [firstTxCart]);

  const handleFirstTxIncrement = async (itemId: string) => {
    const start = performance.now();

    await patch((draft) => {
      const item = draft.items.find((i) => i.id === itemId);
      if (item) {
        item.quantity += 1;
        draft.total = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        draft.lastModified = new Date().toISOString();
      }
    });

    const end = performance.now();
    setActionLatency((prev) => ({ ...prev, firstTx: end - start }));

    await sleep(500);
  };

  const handleTraditionalIncrement = async (itemId: string) => {
    if (!traditionalCart) return;

    const start = performance.now();
    setTraditionalUpdating(true);

    try {
      const item = traditionalCart.items.find((i) => i.id === itemId);
      if (item) {
        const newCart = await updateCartItem(itemId, item.quantity + 1);
        setTraditionalCart(newCart);
        const end = performance.now();
        setActionLatency((prev) => ({ ...prev, traditional: end - start }));
      }
    } finally {
      setTraditionalUpdating(false);
    }
  };

  const timeSaved =
    traditionalResponseTime > 0 && firstTxResponseTime === 0
      ? traditionalResponseTime + actionLatency.traditional - actionLatency.firstTx
      : 0;

  return (
    <ScenarioLayout
      level={2}
      title="Instant Cart"
      badge={{
        icon: <Zap className="h-3 w-3" />,
        label: 'Local-First',
      }}
    >
      <MetricsGrid>
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Initial Load"
          value={firstTxCart ? '0ms' : '--'}
          target="vs 800ms Traditional"
          status={firstTxCart ? 'excellent' : 'good'}
        />
        <MetricCard
          icon={<Zap className="h-5 w-5" />}
          label="Action Latency"
          value={actionLatency.firstTx > 0 ? `${actionLatency.firstTx.toFixed(0)}ms` : '--'}
          target={`vs ${actionLatency.traditional.toFixed(0)}ms`}
          status={actionLatency.firstTx > 0 && actionLatency.firstTx < 100 ? 'excellent' : 'good'}
        />
        <MetricCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Time Saved"
          value={timeSaved > 0 ? `${timeSaved.toFixed(0)}ms` : '--'}
          target="Per Interaction"
          status={timeSaved > 1000 ? 'excellent' : timeSaved > 500 ? 'good' : 'poor'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Traditional CSR vs FirstTx"
        description="Click +1 buttons to see the response time difference. FirstTx updates instantly using local cache."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Traditional CSR</h3>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                800ms load
              </span>
            </div>

            {!traditionalCart && !traditionalLoading && (
              <div className="py-12">
                <button
                  onClick={loadTraditionalCart}
                  className="w-full rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Load Cart
                </button>
              </div>
            )}

            {traditionalLoading && (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
              </div>
            )}

            {traditionalCart && (
              <div className="space-y-3">
                {traditionalCart.items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onIncrement={() => handleTraditionalIncrement(item.id)}
                    loading={traditionalUpdating}
                  />
                ))}
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${traditionalCart.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-4">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              <div className="text-sm">
                <div className="font-medium">Every action waits for server</div>
                <div className="text-muted-foreground">Initial load: ~800ms, Updates: ~500ms</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">FirstTx (Local-First)</h3>
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500">
                0ms response
              </span>
            </div>

            {!firstTxCart && (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
              </div>
            )}

            {firstTxCart && (
              <div className="space-y-3">
                {firstTxCart.items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onIncrement={() => handleFirstTxIncrement(item.id)}
                    loading={false}
                  />
                ))}
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${firstTxCart.total.toFixed(2)}</span>
                  </div>
                  {isSyncing && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Syncing in background...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-4">
            <div className="flex gap-3">
              <Zap className="h-5 w-5 flex-shrink-0 text-green-500" />
              <div className="text-sm">
                <div className="font-medium">Instant local updates</div>
                <div className="text-muted-foreground">
                  Response: ~0ms, Server sync in background
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScenarioLayout>
  );
}

interface CartItemCardProps {
  item: CartItem;
  onIncrement: () => void;
  loading: boolean;
}

function CartItemCard({ item, onIncrement, loading }: CartItemCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded object-cover" />
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm text-muted-foreground">
          ${item.price.toFixed(2)} × {item.quantity}
        </div>
      </div>
      <button
        onClick={onIncrement}
        disabled={loading}
        className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '+1'}
      </button>
    </div>
  );
}
