import { useState } from 'react';
import { Zap, GitBranch, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

interface Transaction {
  id: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled-back';
  startTime: number;
  endTime?: number;
  itemId: string;
  action: string;
}

export default function ConcurrentUpdates() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [concurrentCount, setConcurrentCount] = useState(5);
  const [failureRate, setFailureRate] = useState(30);
  const [stats, setStats] = useState({ success: 0, failed: 0, total: 0 });

  const launchConcurrent = async () => {
    setIsRunning(true);
    setTransactions([]);
    setCartItems([]);

    const newTransactions: Transaction[] = Array.from({ length: concurrentCount }, (_, i) => ({
      id: i + 1,
      status: 'pending',
      startTime: Date.now(),
      itemId: `item-${i + 1}`,
      action: `Add Item ${i + 1}`,
    }));

    setTransactions(newTransactions);

    const results = await Promise.allSettled(
      newTransactions.map((tx) => simulateTransaction(tx.id)),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    setStats({
      success: successCount,
      failed: failedCount,
      total: concurrentCount,
    });

    const finalItems = newTransactions
      .filter((_, i) => results[i].status === 'fulfilled')
      .map((tx) => tx.itemId);

    setCartItems(finalItems);
    setIsRunning(false);
  };

  const simulateTransaction = async (txId: number): Promise<void> => {
    updateTransaction(txId, 'running');

    await sleep(100 + Math.random() * 200);

    const shouldFail = Math.random() * 100 < failureRate;

    if (shouldFail) {
      updateTransaction(txId, 'failed');
      await sleep(50);
      updateTransaction(txId, 'rolled-back');
      throw new Error('Transaction failed');
    } else {
      updateTransaction(txId, 'success');
    }
  };

  const updateTransaction = (id: number, status: Transaction['status']) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id
          ? { ...tx, status, endTime: status !== 'running' ? Date.now() : undefined }
          : tx,
      ),
    );
  };

  const avgDuration =
    transactions.length > 0
      ? transactions
          .filter((tx) => tx.endTime)
          .reduce((sum, tx) => sum + (tx.endTime! - tx.startTime), 0) /
        transactions.filter((tx) => tx.endTime).length
      : 0;

  return (
    <ScenarioLayout
      level={3}
      title="Concurrent Updates"
      badge={{
        icon: <GitBranch className="h-3 w-3" />,
        label: isRunning ? 'Running' : 'Ready',
      }}
    >
      <MetricsGrid>
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Success Rate"
          value={stats.total > 0 ? `${Math.round((stats.success / stats.total) * 100)}%` : '0%'}
          target={`${stats.success}/${stats.total}`}
          status={
            stats.success / stats.total > 0.7
              ? 'excellent'
              : stats.success / stats.total > 0.5
                ? 'good'
                : 'poor'
          }
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Duration"
          value={`${avgDuration.toFixed(0)}ms`}
          target="<200ms"
          status={avgDuration < 200 ? 'excellent' : avgDuration < 300 ? 'good' : 'poor'}
        />
        <MetricCard
          icon={<GitBranch className="h-5 w-5" />}
          label="Data Consistency"
          value={cartItems.length === stats.success ? '✓ Verified' : '✗ Mismatch'}
          target="All tx reflected"
          status={cartItems.length === stats.success ? 'excellent' : 'poor'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Concurrent Transaction Execution"
        description="Launch multiple transactions simultaneously and verify data consistency after rollbacks."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Test Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Concurrent Transactions</span>
                  <span className="font-medium terminal-text">{concurrentCount}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={concurrentCount}
                  onChange={(e) => setConcurrentCount(Number(e.target.value))}
                  className="w-full"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Failure Rate</span>
                  <span className="font-medium terminal-text">{failureRate}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="10"
                  value={failureRate}
                  onChange={(e) => setFailureRate(Number(e.target.value))}
                  className="w-full"
                  disabled={isRunning}
                />
              </div>

              <button
                onClick={launchConcurrent}
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Zap className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
                {isRunning ? 'Running Transactions...' : 'Launch Concurrent Test'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Final State</h3>

            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No items added yet
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded bg-green-500/10 px-4 py-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            )}

            {stats.total > 0 && (
              <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm">
                <div className="mb-2 font-semibold">Summary</div>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total transactions:</span>
                    <span className="font-medium text-foreground">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Succeeded:</span>
                    <span className="font-medium text-green-500">{stats.success}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed & Rolled back:</span>
                    <span className="font-medium text-red-500">{stats.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Final cart items:</span>
                    <span className="font-medium text-foreground">{cartItems.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Transaction Log</h3>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Launch a test to see transactions
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`rounded-lg border p-3 ${
                      tx.status === 'success'
                        ? 'border-green-500/50 bg-green-500/5'
                        : tx.status === 'rolled-back'
                          ? 'border-red-500/50 bg-red-500/5'
                          : tx.status === 'running'
                            ? 'border-yellow-500/50 bg-yellow-500/5'
                            : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground terminal-text">
                          Tx #{tx.id}
                        </span>
                        <span className="text-sm font-medium">{tx.action}</span>
                      </div>
                      <StatusBadge status={tx.status} />
                    </div>
                    {tx.endTime && (
                      <div className="mt-2 text-xs text-muted-foreground terminal-text">
                        Duration: {(tx.endTime - tx.startTime).toFixed(0)}ms
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Validation Rules</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Rollback Order</div>
                  <div className="text-muted-foreground">
                    Failed transactions roll back in LIFO order
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Final Consistency</div>
                  <div className="text-muted-foreground">
                    Cart items = successful transactions only
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">No Partial Updates</div>
                  <div className="text-muted-foreground">Failed transactions leave no trace</div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">notifySubscribers</div>
                  <div className="text-muted-foreground">No duplicate or missed notifications</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScenarioLayout>
  );
}

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const config = {
    pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pending' },
    running: { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Running' },
    success: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      label: 'Success',
    },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
    'rolled-back': {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'Rolled Back',
    },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <div
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${bg} ${color}`}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
