import { useState, useEffect, useRef } from 'react';
import { Clock, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { DemoLayout, MetricsGrid, MetricCard, SectionHeader, BeforeAfter } from '@/components/demo';
import { useSyncedModel } from '@firsttx/local-first';
import { useTx } from '@firsttx/tx';
import { CartModel, type Cart, type CartItem } from '@/models/cart.model';
import {
  createCartRequestGate,
  fetchCart,
  runCartFixture,
  updateCartItem,
  type CartRequestFixture,
  type CartRequestGate,
  type CartRequestGateEvent,
} from '@/api/cart.api';
import { getDemoById, getRelatedDemos } from '@/data/learning-paths';

const demoMeta = getDemoById('instant-cart')!;
const relatedDemos = getRelatedDemos('instant-cart', 2);

type FixtureEvent =
  | 'optimistic-patch'
  | 'optimistic-paint'
  | CartRequestGateEvent
  | 'server-acknowledged'
  | 'snapshot-restored';
type IncrementRequest = {
  itemId: string;
  fixture: CartRequestFixture;
  gate: CartRequestGate;
};

export default function InstantCart() {
  const { data: firstTxCart, patch, isSyncing } = useSyncedModel(CartModel, fetchCart);

  const [traditionalCart, setTraditionalCart] = useState<Cart | null>(null);
  const [traditionalLoading, setTraditionalLoading] = useState(false);
  const [traditionalUpdating, setTraditionalUpdating] = useState(false);

  const [firstTxInitialLoadMs, setFirstTxInitialLoadMs] = useState<number | null>(null);
  const firstTxLoadStartRef = useRef(performance.now());
  const [firstTxServerAck, setFirstTxServerAck] = useState<number | null>(null);
  const firstTxMutationStartRef = useRef<number | null>(null);
  const [traditionalInitialLoadMs, setTraditionalInitialLoadMs] = useState<number | null>(null);
  const [traditionalResponseTime, setTraditionalResponseTime] = useState(0);
  const [actionLatency, setActionLatency] = useState({ firstTx: 0, traditional: 0 });
  const [fixture, setFixture] = useState<CartRequestFixture>('ack');
  const [fixtureEvents, setFixtureEvents] = useState<FixtureEvent[]>([]);
  const [isServerGateOpen, setIsServerGateOpen] = useState(false);
  const requestGateRef = useRef<CartRequestGate | null>(null);

  const addFixtureEvent = (event: FixtureEvent) => {
    setFixtureEvents((events) => [...events, event]);
  };

  const { mutateAsync: incrementItem, isPending: isIncrementing } = useTx({
    optimistic: async ({ itemId, gate }: IncrementRequest) => {
      if (!firstTxCart) {
        throw new Error('Cart unavailable');
      }
      const snapshot: Cart = structuredClone(firstTxCart);
      await patch((draft) => {
        const item = draft.items.find((i) => i.id === itemId);

        if (item) {
          item.quantity += 1;
          draft.total = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
          draft.lastModified = new Date().toISOString();
        }
      });
      addFixtureEvent('optimistic-patch');
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (firstTxMutationStartRef.current !== null) {
        setActionLatency((prev) => ({
          ...prev,
          firstTx: performance.now() - firstTxMutationStartRef.current!,
        }));
      }
      addFixtureEvent('optimistic-paint');
      await gate.holdRequestStart();
      return snapshot;
    },

    rollback: async (_request: IncrementRequest, snapshot?: Cart) => {
      if (!snapshot) return;
      await patch((draft) => {
        draft.items = snapshot.items.map((item) => ({ ...item }));
        draft.total = snapshot.total;
        draft.lastModified = snapshot.lastModified;
      });
      addFixtureEvent('snapshot-restored');
    },

    request: async ({ itemId, fixture: requestFixture, gate }: IncrementRequest) => {
      const latest = await CartModel.getSnapshot();
      const item = latest?.items.find((i) => i.id === itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const result = await runCartFixture({
        itemId,
        quantity: item.quantity,
        fixture: requestFixture,
        gate,
      });
      return result;
    },

    transition: true,

    onSuccess: (result, { itemId }: IncrementRequest) => {
      if (firstTxMutationStartRef.current !== null) {
        setFirstTxServerAck(performance.now() - firstTxMutationStartRef.current);
        firstTxMutationStartRef.current = null;
      }
      addFixtureEvent('server-acknowledged');
      console.log('[SUCCESS]', itemId, result);
    },

    onError: (error, { itemId }: IncrementRequest) => {
      firstTxMutationStartRef.current = null;
      console.error('[ERROR]', itemId, error);
    },
  });

  const loadTraditionalCart = async () => {
    const start = performance.now();
    setTraditionalLoading(true);

    try {
      const cart = await fetchCart();
      setTraditionalCart(cart);
      const end = performance.now();
      setTraditionalResponseTime(end - start);
      if (traditionalInitialLoadMs === null) {
        setTraditionalInitialLoadMs(end - start);
      }
    } finally {
      setTraditionalLoading(false);
    }
  };

  useEffect(() => {
    const shouldAutoLoad =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem('firsttx:autoLoadTraditional') === '1';
    if (shouldAutoLoad && !traditionalCart && !traditionalLoading) {
      loadTraditionalCart().catch((error) => {
        console.error('Auto load traditional cart failed', error);
      });
    }
  }, [traditionalCart, traditionalLoading]);

  useEffect(() => {
    if (firstTxCart && firstTxInitialLoadMs === null) {
      setFirstTxInitialLoadMs(performance.now() - firstTxLoadStartRef.current);
    }
  }, [firstTxCart, firstTxInitialLoadMs]);

  const handleFirstTxIncrement = (itemId: string) => {
    const start = performance.now();

    if (!firstTxCart) {
      console.warn('firstTxCart is null!');
      return;
    }

    firstTxMutationStartRef.current = start;
    setFixtureEvents([]);
    const gate = createCartRequestGate(addFixtureEvent);
    requestGateRef.current = gate;
    setIsServerGateOpen(true);
    incrementItem({ itemId, fixture, gate }).catch(() => {
      firstTxMutationStartRef.current = null;
    });
  };

  const releaseServerGate = () => {
    requestGateRef.current?.release();
    requestGateRef.current = null;
    setIsServerGateOpen(false);
  };

  const resetFixture = async () => {
    releaseServerGate();
    const cart = await fetchCart();
    await CartModel.replace(cart);
    setTraditionalCart(null);
    setFixtureEvents([]);
    setFirstTxServerAck(null);
    setActionLatency({ firstTx: 0, traditional: 0 });
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
    traditionalResponseTime > 0 && firstTxInitialLoadMs !== null
      ? traditionalResponseTime + actionLatency.traditional - actionLatency.firstTx
      : 0;

  return (
    <DemoLayout
      level={demoMeta.level}
      title={demoMeta.title}
      packages={demoMeta.packages}
      difficulty={demoMeta.difficulty}
      duration={demoMeta.duration}
      problem={demoMeta.problem}
      solution={demoMeta.solution}
      problemDetails={demoMeta.problemDetails}
      solutionDetails={demoMeta.solutionDetails}
      codeSnippet={demoMeta.codeSnippet}
      codeTitle={demoMeta.codeTitle}
      docsLink={demoMeta.docsLink}
      relatedDemos={relatedDemos}
    >
      <MetricsGrid>
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Initial Load"
          value={firstTxInitialLoadMs !== null ? `${firstTxInitialLoadMs.toFixed(1)}ms` : '--'}
          target={
            traditionalInitialLoadMs !== null
              ? `vs ${traditionalInitialLoadMs.toFixed(1)}ms Traditional`
              : 'Awaiting data'
          }
          status={firstTxCart ? 'excellent' : 'good'}
        />
        <MetricCard
          icon={<Zap className="h-5 w-5" />}
          label="Action Latency"
          value={actionLatency.firstTx > 0 ? `${actionLatency.firstTx.toFixed(1)}ms` : '--'}
          target={
            actionLatency.traditional > 0
              ? `vs ${actionLatency.traditional.toFixed(1)}ms`
              : 'Click +1 to measure'
          }
          status={actionLatency.firstTx > 0 && actionLatency.firstTx < 100 ? 'excellent' : 'good'}
        />
        <MetricCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Time Saved"
          value={timeSaved > 0 ? `${timeSaved.toFixed(1)}ms` : '--'}
          target="Per Interaction"
          status={timeSaved > 1000 ? 'excellent' : timeSaved > 500 ? 'good' : 'poor'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Traditional CSR vs FirstTx"
        description="Use both +1 buttons to compare a request-first update with an optimistic local update followed by server acknowledgement."
      />

      <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Zap className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm">
            <div className="font-medium text-blue-400">Try This</div>
            <div className="text-muted-foreground">
              Use both +1 buttons and compare when the quantity changes and when the server
              acknowledges it. Refresh to check whether the local copy is available first.
            </div>
          </div>
        </div>
      </div>

      <div
        className="sr-only"
        data-testid="instant-cart-metrics"
        data-firsttx-initial={firstTxInitialLoadMs ?? ''}
        data-traditional-initial={traditionalInitialLoadMs ?? ''}
        data-firsttx-action={actionLatency.firstTx || ''}
        data-traditional-action={actionLatency.traditional || ''}
        data-firsttx-server-ack={firstTxServerAck ?? ''}
        data-time-saved={timeSaved || ''}
        data-fixture={fixture}
      />

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label
            className="flex min-w-52 flex-1 flex-col gap-2 text-sm font-medium"
            htmlFor="instant-cart-fixture"
          >
            Deterministic request fixture
            <select
              id="instant-cart-fixture"
              data-testid="instant-cart-fixture"
              value={fixture}
              onChange={(event) => setFixture(event.target.value as CartRequestFixture)}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
              disabled={isIncrementing}
            >
              <option value="ack">Server acknowledgement</option>
              <option value="reject">Server rejection and snapshot restore</option>
            </select>
          </label>
          <button
            data-testid="reset-instant-cart-fixture"
            onClick={() => void resetFixture()}
            disabled={isIncrementing}
            className="rounded border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Reset fixture
          </button>
          <button
            data-testid="release-instant-cart-server"
            onClick={releaseServerGate}
            disabled={!isServerGateOpen}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Release server
          </button>
        </div>
        <ol
          data-testid="instant-cart-events"
          className="mt-4 space-y-1 text-sm text-muted-foreground"
        >
          {fixtureEvents.length === 0 ? (
            <li>Run the selected fixture to inspect its ordered events.</li>
          ) : (
            fixtureEvents.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)
          )}
        </ol>
      </div>

      <BeforeAfter
        before={{
          label: 'Traditional CSR',
          description:
            'The fixture waits for the server response before showing the loaded cart or update.',
          demo: (
            <div className="space-y-4" data-testid="traditional-panel">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  800ms simulated delay
                </span>
              </div>

              {!traditionalCart && !traditionalLoading && (
                <div className="py-8">
                  <button
                    onClick={loadTraditionalCart}
                    className="w-full rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Load Cart
                  </button>
                </div>
              )}

              {traditionalLoading && (
                <div className="py-8 text-center">
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
                      testId="traditional-increment"
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
          ),
          metrics: [
            {
              label: 'Initial Load',
              value:
                traditionalInitialLoadMs !== null
                  ? `${traditionalInitialLoadMs.toFixed(1)}ms`
                  : 'Not measured',
              status: 'bad',
            },
            {
              label: 'Update',
              value:
                actionLatency.traditional > 0
                  ? `${actionLatency.traditional.toFixed(1)}ms`
                  : 'Not measured',
              status: 'bad',
            },
          ],
        }}
        after={{
          label: 'FirstTx (Local-First)',
          description:
            'Reads the local copy first, applies the optimistic change, and tracks the server acknowledgement separately.',
          demo: (
            <div className="space-y-4" data-testid="firsttx-panel">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500">
                  Optimistic paint first
                </span>
              </div>

              {!firstTxCart && (
                <div className="py-8 text-center">
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
                      testId="firsttx-increment"
                    />
                  ))}
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${firstTxCart.total.toFixed(2)}</span>
                    </div>
                    {(isSyncing || isIncrementing) && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>{isIncrementing ? 'Updating...' : 'Syncing in background...'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ),
          metrics: [
            {
              label: 'Initial Load',
              value:
                firstTxInitialLoadMs !== null
                  ? `${firstTxInitialLoadMs.toFixed(1)}ms`
                  : 'Not measured',
              status: 'excellent',
            },
            {
              label: 'Update',
              value:
                actionLatency.firstTx > 0
                  ? `${actionLatency.firstTx.toFixed(1)}ms`
                  : 'Not measured',
              status: 'excellent',
            },
          ],
        }}
      />
    </DemoLayout>
  );
}

interface CartItemCardProps {
  item: CartItem;
  onIncrement: () => void;
  loading: boolean;
  testId?: string;
}

function CartItemCard({ item, onIncrement, loading, testId }: CartItemCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded object-cover" />
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm text-muted-foreground">
          ${item.price.toFixed(2)} x{' '}
          <span data-testid={testId ? `${testId}-quantity-${item.id}` : undefined}>
            {item.quantity}
          </span>
        </div>
      </div>
      <button
        onClick={onIncrement}
        disabled={loading}
        className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        data-testid={testId ? `${testId}-${item.id}` : undefined}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '+1'}
      </button>
    </div>
  );
}
