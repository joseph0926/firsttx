import { useCallback, useMemo, useState } from 'react';
import { GitBranch, CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';
import { useSyncedModel } from '@firsttx/local-first';
import { useTx } from '@firsttx/tx';
import { ConcurrentInventoryModel } from '@/models/concurrent-inventory.model';
import { reserveItem, fetchInventory } from '@/api/concurrent-inventory.api';
import { sleep } from '@/lib/utils';

interface TransactionLog {
  id: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled-back';
  startTime: number;
  endTime?: number;
  attempts: number;
  retries: number;
  itemId: string;
  action: string;
}

interface MetricsSnapshot {
  successRate: number | null;
  avgDuration: number | null;
  totalTransactions: number;
  totalRetries: number;
  dataConsistent: boolean | null;
}

export default function ConcurrentUpdates() {
  const {
    data: inventory,
    patch,
    sync,
    isSyncing,
  } = useSyncedModel(ConcurrentInventoryModel, fetchInventory, {
    onSuccess: () => console.log('[Concurrent] Inventory synced'),
    onError: (err) => console.error('[Concurrent] Sync failed:', err),
  });

  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [concurrentCount, setConcurrentCount] = useState(5);
  const [failureRate, setFailureRate] = useState(30);
  const [stats, setStats] = useState({ success: 0, failed: 0, total: 0 });

  const updateTransaction = useCallback((id: number, status: TransactionLog['status']) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id
          ? { ...tx, status, endTime: status !== 'running' ? Date.now() : undefined }
          : tx,
      ),
    );
  }, []);

  const optimistic = useCallback(
    async ({ txId, itemId }: { txId: number; itemId: string }) => {
      updateTransaction(txId, 'running');
      await patch((draft) => {
        const item = draft.items[itemId];
        if (item) {
          item.reserved += 1;
          item.stock -= 1;
        }
      });
      console.log(`[Tx ${txId}] Optimistic reserve: ${itemId}`);
    },
    [patch, updateTransaction],
  );

  const rollback = useCallback(
    async ({ txId, itemId }: { txId: number; itemId: string }) => {
      await patch((draft) => {
        const item = draft.items[itemId];
        if (item) {
          item.reserved -= 1;
          item.stock += 1;
        }
      });
      console.log(`[Tx ${txId}] Rollback: ${itemId}`);
      updateTransaction(txId, 'rolled-back');
    },
    [patch, updateTransaction],
  );

  const request = useCallback(
    async ({ txId, itemId }: { txId: number; itemId: string }) => {
      await sleep(50 + Math.random() * 100);
      await reserveItem(itemId, failureRate);
      console.log(`[Tx ${txId}] Server confirmed: ${itemId}`);
      return { txId, itemId };
    },
    [failureRate],
  );

  const onSuccess = useCallback(
    (_: unknown, { txId }: { txId: number }) => {
      updateTransaction(txId, 'success');
    },
    [updateTransaction],
  );

  const { mutateAsync: reserveItemTx } = useTx({
    optimistic,
    rollback,
    request,
    transition: true,
    retry: { maxAttempts: 1 },
    onSuccess,
    onError: () => {},
  });

  const launchConcurrent = async () => {
    setIsRunning(true);
    setTransactions([]);
    setStats({ success: 0, failed: 0, total: 0 });

    const itemIds = inventory
      ? Object.keys(inventory.items).slice(0, concurrentCount)
      : Array.from({ length: concurrentCount }, (_, i) => `item-${i + 1}`);

    const newTransactions: TransactionLog[] = itemIds.map((itemId, i) => ({
      id: i + 1,
      status: 'pending',
      startTime: Date.now(),
      attempts: 0,
      retries: 0,
      itemId,
      action: `Reserve ${itemId}`,
    }));

    setTransactions(newTransactions);

    const results = await Promise.allSettled(
      newTransactions.map((tx) => reserveItemTx({ txId: tx.id, itemId: tx.itemId })),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    setStats({
      success: successCount,
      failed: failedCount,
      total: concurrentCount,
    });

    setIsRunning(false);
  };

  const resetInventory = async () => {
    if (isSyncing) return;

    await sync();
    setTransactions([]);
    setStats({ success: 0, failed: 0, total: 0 });
  };

  const avgDuration =
    transactions.length > 0
      ? transactions
          .filter((tx) => tx.endTime)
          .reduce((sum, tx) => sum + (tx.endTime! - tx.startTime), 0) /
        transactions.filter((tx) => tx.endTime).length
      : 0;

  const totalReserved = inventory
    ? Object.values(inventory.items).reduce((sum, item) => sum + item.reserved, 0)
    : 0;

  const isDataConsistent = stats.total > 0 ? totalReserved === stats.success : true;

  const totalRetries = useMemo(
    () => transactions.reduce((sum, tx) => sum + tx.retries, 0),
    [transactions],
  );

  const metrics: MetricsSnapshot = {
    successRate: stats.total > 0 ? Number(((stats.success / stats.total) * 100).toFixed(1)) : null,
    avgDuration: Number(avgDuration.toFixed(1)) || null,
    totalTransactions: stats.total,
    totalRetries,
    dataConsistent: stats.total > 0 ? isDataConsistent : null,
  };

  return (
    <ScenarioLayout
      level={3}
      title="Concurrent Updates"
      badge={{
        icon: <GitBranch className="h-3 w-3" />,
        label: 'Atomic Rollback',
      }}
    >
      <MetricsGrid>
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Success Rate"
          value={stats.total > 0 ? `${((stats.success / stats.total) * 100).toFixed(0)}%` : '--'}
          target={`${stats.success}/${stats.total} succeeded`}
          status={
            stats.total === 0
              ? 'good'
              : stats.success / stats.total >= 0.7
                ? 'excellent'
                : stats.success / stats.total >= 0.5
                  ? 'good'
                  : 'poor'
          }
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Duration"
          value={avgDuration > 0 ? `${avgDuration.toFixed(0)}ms` : '--'}
          target="Per Transaction"
          status={
            avgDuration === 0
              ? 'good'
              : avgDuration < 200
                ? 'excellent'
                : avgDuration < 300
                  ? 'good'
                  : 'poor'
          }
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Data Integrity"
          value={stats.total === 0 ? 'Not tested' : isDataConsistent ? '✓ Verified' : '✗ Mismatch'}
          target="Reserved = Success"
          status={stats.total === 0 ? 'good' : isDataConsistent ? 'excellent' : 'poor'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Concurrent Transaction Execution"
        description="Launch multiple transactions simultaneously. FirstTx ensures each rollback is atomic - failed transactions never leave partial state."
      />

      <div className="mb-6 space-y-4">
        <div
          className="sr-only"
          data-testid="concurrent-metrics"
          data-success-rate={metrics.successRate ?? ''}
          data-avg-duration={metrics.avgDuration ?? ''}
          data-total-transactions={metrics.totalTransactions}
          data-total-retries={metrics.totalRetries}
          data-data-consistent={metrics.dataConsistent ?? ''}
        />
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Test Configuration</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Concurrent Transactions: {concurrentCount}
              </label>
              <input
                type="range"
                min="2"
                max="5"
                value={concurrentCount}
                onChange={(e) => setConcurrentCount(Number(e.target.value))}
                disabled={isRunning}
                className="w-full"
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Simulates {concurrentCount} users reserving items simultaneously
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Failure Rate: {failureRate}%</label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={failureRate}
                onChange={(e) => setFailureRate(Number(e.target.value))}
                disabled={isRunning}
                className="w-full"
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Probability of server rejecting reservation
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={launchConcurrent}
              disabled={isRunning || !inventory}
              className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <GitBranch className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
              {isRunning ? 'Running...' : 'Launch Concurrent Transactions'}
            </button>
            <button
              onClick={resetInventory}
              disabled={isRunning || !inventory || isSyncing}
              className="flex items-center gap-2 rounded border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Reset Inventory'}
            </button>
          </div>
        </div>

        {inventory && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Inventory State</h3>
            <div className="grid gap-3 md:grid-cols-5">
              {Object.values(inventory.items).map((item) => (
                <div key={item.id} className="rounded bg-muted p-3">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Stock: {item.stock} | Reserved: {item.reserved}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Transaction Log</h3>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    {tx.status === 'pending' && <Clock className="h-4 w-4 text-muted-foreground" />}
                    {tx.status === 'running' && (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {tx.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {tx.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                    {tx.status === 'rolled-back' && <XCircle className="h-4 w-4 text-yellow-500" />}
                    <div>
                      <div className="text-sm font-medium">
                        Tx #{tx.id}: {tx.action}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx.status === 'pending' && 'Waiting...'}
                        {tx.status === 'running' && 'Executing...'}
                        {tx.status === 'success' && 'Committed successfully'}
                        {tx.status === 'failed' && 'Failed - initiating rollback'}
                        {tx.status === 'rolled-back' && 'Rolled back successfully'}
                      </div>
                    </div>
                  </div>
                  {tx.endTime && (
                    <div className="text-xs text-muted-foreground">
                      {tx.endTime - tx.startTime}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScenarioLayout>
  );
}
