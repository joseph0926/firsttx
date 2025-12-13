import { useEffect, useState } from 'react';
import { Clock, Zap, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { DemoLayout, MetricsGrid, MetricCard, SectionHeader } from '@/components/demo';
import { useSyncedModel } from '@firsttx/local-first';
import { startTransaction } from '@firsttx/tx';
import { CartModel, type Cart } from '@/models/cart.model';
import { fetchCart, updateCartItem } from '@/api/cart.api';
import { sleep } from '@/lib/utils';
import { getDemoById, getRelatedDemos } from '@/data/learning-paths';

const demoMeta = getDemoById('timing')!;
const relatedDemos = getRelatedDemos('timing', 2);

interface TimelineEvent {
  time: number;
  label: string;
  type: 'tx-start' | 'tx-step' | 'server-sync' | 'tx-rollback' | 'tx-commit';
  status?: 'pending' | 'success' | 'error';
}

const TARGET_ITEM_ID = '1';
const SERVER_OVERRIDE_QTY = 5;

const countItems = (cart?: Cart | null) =>
  cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

export default function TimingAttack() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [cartItems, setCartItems] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null);
  const [serverSyncTiming, setServerSyncTiming] = useState(50);
  const [stats, setStats] = useState({ total: 0, passes: 0 });

  const {
    data: cart,
    patch,
    sync,
  } = useSyncedModel(CartModel, fetchCart, {
    syncOnMount: 'stale',
  });

  useEffect(() => {
    setCartItems(countItems(cart));
  }, [cart]);

  const consistencyRate = stats.total === 0 ? 100 : Math.round((stats.passes / stats.total) * 100);

  const runTimingTest = async () => {
    if (!cart) {
      await sync();
      return;
    }

    setIsSimulating(true);
    setTimeline([]);
    setTestResult(null);

    const startTime = performance.now();
    const events: TimelineEvent[] = [];

    const addEvent = (
      label: string,
      type: TimelineEvent['type'],
      status?: TimelineEvent['status'],
    ) => {
      const time = performance.now() - startTime;
      events.push({ time, label, type, status: status || 'pending' });
      setTimeline([...events]);
    };

    const tx = startTransaction({ transition: true });
    addEvent('Transaction started', 'tx-start', 'success');

    const refreshCartCount = async () => {
      const snapshot = await CartModel.getSnapshot();
      setCartItems(countItems(snapshot));
      return snapshot;
    };

    const triggerServerSync = () =>
      (async () => {
        addEvent('Server sync scheduled', 'server-sync', 'pending');
        await sleep(serverSyncTiming);
        const serverCart = await updateCartItem(TARGET_ITEM_ID, SERVER_OVERRIDE_QTY);
        await CartModel.replace(serverCart);
        await refreshCartCount();
        addEvent(`Server sync applied ${SERVER_OVERRIDE_QTY} items`, 'server-sync', 'success');
      })();

    let serverSyncPromise: Promise<void> | null = null;

    try {
      await tx.run(
        async () => {
          addEvent('Step 1: Optimistic update (+1 item)', 'tx-step', 'pending');
          await patch((draft) => {
            const item = draft.items.find((i) => i.id === TARGET_ITEM_ID);
            if (item) {
              item.quantity += 1;
              draft.total = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
              draft.lastModified = new Date().toISOString();
            }
          });
          await refreshCartCount();
          addEvent('Optimistic write applied locally', 'tx-step', 'success');
        },
        {
          compensate: async () => {
            addEvent('Rollback: reverting optimistic change', 'tx-rollback', 'pending');
            await patch((draft) => {
              const item = draft.items.find((i) => i.id === TARGET_ITEM_ID);
              if (item) {
                item.quantity -= 1;
                draft.total = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                draft.lastModified = new Date().toISOString();
              }
            });
            await refreshCartCount();
            addEvent('Optimistic change reverted', 'tx-rollback', 'success');
          },
        },
      );

      serverSyncPromise = triggerServerSync();

      await tx.run(async () => {
        addEvent('Step 2: Server mutation (simulated)', 'tx-step', 'pending');
        await sleep(250);
        throw new Error('API request failed');
      });

      await serverSyncPromise;
      await tx.commit();
      addEvent('Transaction committed', 'tx-commit', 'success');
      setTestResult('pass');
      setStats((prev) => ({
        total: prev.total + 1,
        passes: prev.passes + 1,
      }));
    } catch (error) {
      console.error(error);
      addEvent('Step 2 failed - starting rollback', 'tx-step', 'error');

      if (!serverSyncPromise) {
        serverSyncPromise = triggerServerSync();
      }

      await serverSyncPromise;
      const latest = await refreshCartCount();
      const serverPreserved =
        latest?.items.find((item) => item.id === TARGET_ITEM_ID)?.quantity === SERVER_OVERRIDE_QTY;

      addEvent(
        serverPreserved
          ? 'Rollback respected server snapshot'
          : 'Rollback overwrote server snapshot',
        'tx-rollback',
        serverPreserved ? 'success' : 'error',
      );

      setTestResult(serverPreserved ? 'pass' : 'fail');
      setStats((prev) => ({
        total: prev.total + 1,
        passes: prev.passes + (serverPreserved ? 1 : 0),
      }));
    } finally {
      setIsSimulating(false);
    }
  };

  const resetTest = () => {
    setTimeline([]);
    setCartItems(countItems(cart));
    setTestResult(null);
  };

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
          label="Server Sync Delay"
          value={`${serverSyncTiming}ms`}
          target="Variable"
          status="good"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Data Consistency"
          value={`${consistencyRate}%`}
          target="100%"
          status={consistencyRate === 100 ? 'excellent' : consistencyRate > 80 ? 'good' : 'poor'}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Race Conditions"
          value={
            testResult === 'fail' ? 'Detected' : testResult === 'pass' ? 'Protected' : 'Not tested'
          }
          target="Protected"
          status={testResult === 'pass' ? 'excellent' : testResult === 'fail' ? 'poor' : 'good'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Race Condition Simulator"
        description="Test what happens when server sync arrives during transaction execution. Will the rollback preserve server data?"
      />

      <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Zap className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm">
            <div className="font-medium text-blue-400">Try This</div>
            <div className="text-muted-foreground">
              Adjust the server sync timing with the slider and run the test. Server data should be
              preserved regardless of timing.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Current State</h3>

            <div className="mb-6 rounded-lg bg-muted/50 p-8 text-center">
              <div className="text-sm text-muted-foreground mb-2">Cart Items</div>
              <div
                className={`text-6xl font-bold transition-colors ${
                  testResult === 'pass'
                    ? 'text-green-500'
                    : testResult === 'fail'
                      ? 'text-red-500'
                      : 'text-foreground'
                }`}
              >
                {cartItems}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Initial state:</span>
                <span className="font-medium">3 items</span>
              </div>
              <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Optimistic update:</span>
                <span className="font-medium">+1 item (4 total)</span>
              </div>
              <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Server sync:</span>
                <span className="font-medium">5 items</span>
              </div>
              <div className="flex justify-between rounded bg-primary/10 px-3 py-2">
                <span className="text-muted-foreground">Expected after rollback:</span>
                <span className="font-medium text-primary">5 items</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Test Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Server Sync Timing</span>
                  <span className="font-medium terminal-text">{serverSyncTiming}ms</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={serverSyncTiming}
                  onChange={(e) => setServerSyncTiming(Number(e.target.value))}
                  className="w-full"
                  disabled={isSimulating}
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Early (10ms)</span>
                  <span>Late (200ms)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={runTimingTest}
                  disabled={isSimulating}
                  className="flex-1 flex items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Zap className={`h-4 w-4 ${isSimulating ? 'animate-pulse' : ''}`} />
                  {isSimulating ? 'Testing...' : 'Run Timing Test'}
                </button>
                <button
                  onClick={resetTest}
                  disabled={isSimulating}
                  className="rounded border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-6 ${
                testResult === 'pass'
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-red-500/50 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {testResult === 'pass' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <h4 className="font-semibold">
                    {testResult === 'pass' ? 'Test Passed' : 'Test Failed'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {testResult === 'pass'
                      ? 'Server data was preserved during rollback'
                      : 'Race condition detected: server data was lost'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Timeline</h3>

            <div className="space-y-2">
              {timeline.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Run a test to see the timeline
                </div>
              ) : (
                timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-16 pt-1 text-xs text-muted-foreground terminal-text">
                      {event.time.toFixed(0)}ms
                    </div>
                    <div className="shrink-0 pt-1">
                      {event.type === 'tx-start' && <Zap className="h-4 w-4 text-blue-500" />}
                      {event.type === 'tx-step' && event.status === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {event.type === 'tx-step' && event.status === 'error' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      {event.type === 'server-sync' && (
                        <Activity className="h-4 w-4 text-yellow-500" />
                      )}
                      {event.type === 'tx-rollback' && event.status === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {event.type === 'tx-rollback' && event.status === 'error' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      {event.type === 'tx-rollback' && event.status === 'pending' && (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 rounded bg-muted/30 px-3 py-2 text-sm">
                      {event.label}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Expected Behavior</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Protected Against Race</div>
                  <div className="text-muted-foreground">
                    Tx rollback should NOT overwrite server data
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Memory Cache Integrity</div>
                  <div className="text-muted-foreground">Cache must reflect final server state</div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">notifySubscribers Order</div>
                  <div className="text-muted-foreground">
                    React components update with correct data
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
