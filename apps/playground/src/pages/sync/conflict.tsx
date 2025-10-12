import { useState, useEffect } from 'react';
import { RefreshCw, GitMerge, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';
import { useSyncedModel } from '@firsttx/local-first';
import { ProductModel } from '../../models/product.model';
import { fetchProduct, simulateServerChange, getServerState } from '../../api/product.api';

type LogEntry = { time: string; message: string; type: 'info' | 'warning' | 'success' | 'error' };

export default function ConflictResolution() {
  const {
    data: product,
    patch,
    sync,
    isSyncing,
    error,
    history,
  } = useSyncedModel(ProductModel, fetchProduct, {
    onSuccess: (data) => {
      addLog(`Sync completed: merged to ${data.quantity} units @ $${data.price}`, 'success');
    },
    onError: (err) => {
      addLog(`Sync failed: ${err.message}`, 'error');
    },
  });

  const [conflictLog, setConflictLog] = useState<LogEntry[]>([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [resolutionTime, setResolutionTime] = useState(0);
  const [serverData, setServerData] = useState(getServerState());

  useEffect(() => {
    const interval = setInterval(() => {
      setServerData(getServerState());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setConflictLog((prev) => [...prev, { time, message, type }]);
  };

  const simulateConflict = async () => {
    if (!product) return;

    setConflictLog([]);
    addLog('Starting conflict simulation...', 'info');

    addLog(
      `Current local: qty=${product.quantity}, price=$${product.price}, v=${product.version}`,
      'info',
    );

    simulateServerChange({
      quantity: product.quantity + 5,
      price: product.price - 100,
    });

    const newServer = getServerState();
    setServerData(newServer);

    addLog(
      `Server changed: qty=${newServer.quantity}, price=$${newServer.price}, v=${newServer.version}`,
      'warning',
    );
    addLog('Version mismatch detected! Conflict will occur on sync.', 'warning');

    setConflictCount((prev) => prev + 1);
  };

  const handleSync = async () => {
    if (!product) return;

    const startTime = performance.now();
    setResolutionTime(0);

    addLog('Triggering sync...', 'info');
    addLog(`Local state: qty=${product.quantity}, v=${product.version}`, 'info');
    addLog(`Server state: qty=${serverData.quantity}, v=${serverData.version}`, 'info');

    try {
      await sync();
      const endTime = performance.now();
      setResolutionTime(endTime - startTime);
      addLog(`Resolution completed in ${(endTime - startTime).toFixed(0)}ms`, 'success');
    } catch (err) {
      console.error(err);
      const endTime = performance.now();
      setResolutionTime(endTime - startTime);
      addLog(`Sync failed after ${(endTime - startTime).toFixed(0)}ms`, 'error');
    }
  };

  const updateLocal = async (field: 'quantity' | 'price', value: number) => {
    if (!product) return;

    await patch((draft) => {
      draft[field] = value;
      draft.lastModified = new Date().toISOString();
    });

    addLog(`Local update: ${field}=${value}`, 'info');
  };

  return (
    <ScenarioLayout
      level={2}
      title="Conflict Resolution"
      badge={{
        icon: <GitMerge className="h-3 w-3" />,
        label: 'Sync Active',
      }}
    >
      <MetricsGrid>
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Resolution Time"
          value={`${resolutionTime.toFixed(0)}ms`}
          target="<100ms"
          status={
            resolutionTime === 0
              ? 'good'
              : resolutionTime < 100
                ? 'excellent'
                : resolutionTime < 200
                  ? 'good'
                  : 'poor'
          }
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Conflicts Detected"
          value={conflictCount.toString()}
          target="Auto-resolved"
          status="good"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Resolution Strategy"
          value="Server Wins (merge)"
          target="Configurable"
          status="good"
        />
      </MetricsGrid>

      <SectionHeader
        title="Data Conflict Simulator"
        description="Watch how local modifications resolve against incoming server data. Simulates version-based conflict detection (Optimistic Concurrency Control)."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Local State</h3>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500">
                Client
              </span>
            </div>

            {product ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Product Name</label>
                  <div className="rounded bg-muted/50 px-3 py-2 font-medium">
                    {product.productName}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => updateLocal('quantity', Number(e.target.value))}
                    className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Price ($)</label>
                  <input
                    type="number"
                    value={product.price}
                    onChange={(e) => updateLocal('price', Number(e.target.value))}
                    className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="pt-2 text-xs text-muted-foreground terminal-text">
                  <div>Version: {product.version}</div>
                  <div>Modified: {new Date(product.lastModified).toLocaleTimeString()}</div>
                  <div>Stale: {history.isStale ? 'Yes' : 'No'}</div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Server State</h3>
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500">
                Authoritative
              </span>
            </div>

            <div className="space-y-3">
              <DataField label="Product Name" value={serverData.productName} />
              <DataField label="Quantity" value={serverData.quantity} />
              <DataField label="Price" value={`$${serverData.price}`} />
              <div className="pt-2 text-xs text-muted-foreground terminal-text">
                <div>Version: {serverData.version}</div>
                <div>Modified: {new Date(serverData.lastModified).toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={simulateConflict}
              disabled={!product || isSyncing}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-600 disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />
              Simulate Server Change
            </button>
            <button
              onClick={handleSync}
              disabled={!product || isSyncing}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync with Server'}
            </button>
          </div>

          {error && (
            <div className="rounded bg-destructive/10 p-3 text-sm text-destructive">
              Error: {error.message}
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Conflict Log</h3>
              <button
                onClick={() => setConflictLog([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>

            <div className="max-h-96 space-y-1 overflow-y-auto terminal-text text-xs">
              {conflictLog.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Modify local data, then click "Simulate Server Change" to create a conflict
                </div>
              ) : (
                conflictLog.map((log, i) => (
                  <div key={i} className="flex gap-2 rounded bg-muted/30 px-2 py-1">
                    <span className="text-muted-foreground">[{log.time}]</span>
                    <span
                      className={
                        log.type === 'success'
                          ? 'text-green-500'
                          : log.type === 'warning'
                            ? 'text-yellow-500'
                            : log.type === 'error'
                              ? 'text-red-500'
                              : 'text-foreground'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">How It Works</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            title="1. Version Tracking"
            description="Each update increments the version number. Mismatches indicate conflicts."
          />
          <InfoCard
            title="2. Merge Function"
            description="Model's merge() decides how to combine local and server data."
          />
          <InfoCard
            title="3. ViewTransition"
            description="Smooth visual transition when resolving conflicts (<100ms target)."
          />
        </div>
      </div>
    </ScenarioLayout>
  );
}

function DataField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-muted/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="mb-1 font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
