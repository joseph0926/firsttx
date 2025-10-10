import { useState } from 'react';
import { RefreshCw, GitMerge, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

interface DataState {
  productName: string;
  quantity: number;
  price: number;
  lastModified: string;
  source: 'local' | 'server' | 'merged';
}

export default function ConflictResolution() {
  const [localData, setLocalData] = useState<DataState>({
    productName: 'Laptop Pro',
    quantity: 5,
    price: 1299,
    lastModified: new Date().toISOString(),
    source: 'local',
  });

  const [serverData] = useState<DataState>({
    productName: 'Laptop Pro',
    quantity: 10,
    price: 1199,
    lastModified: new Date(Date.now() - 5000).toISOString(),
    source: 'server',
  });

  const [finalData, setFinalData] = useState<DataState | null>(null);
  const [conflictLog, setConflictLog] = useState<
    Array<{ time: string; message: string; type: 'info' | 'warning' | 'success' }>
  >([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [resolutionTime, setResolutionTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const addLog = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setConflictLog((prev) => [...prev, { time, message, type }]);
  };

  const simulateConflict = async () => {
    setIsSimulating(true);
    setFinalData(null);
    setConflictLog([]);

    const startTime = performance.now();

    addLog('Local modification detected', 'info');
    await sleep(300);

    addLog('Server sync triggered', 'info');
    await sleep(300);

    addLog('Conflict detected: quantity mismatch (local: 5, server: 10)', 'warning');
    addLog('Conflict detected: price mismatch (local: $1299, server: $1199)', 'warning');
    await sleep(500);

    addLog('Applying resolution strategy: Server wins', 'info');
    await sleep(300);

    const merged: DataState = {
      ...serverData,
      lastModified: new Date().toISOString(),
      source: 'merged',
    };

    setFinalData(merged);
    setConflictCount((prev) => prev + 1);

    const endTime = performance.now();
    setResolutionTime(endTime - startTime);

    addLog('Conflict resolved successfully', 'success');
    addLog('ViewTransition applied for smooth update', 'success');

    setIsSimulating(false);
  };

  const updateLocalData = (field: keyof DataState, value: string | number) => {
    setLocalData((prev) => ({
      ...prev,
      [field]: value,
      lastModified: new Date().toISOString(),
    }));
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
          status={resolutionTime < 100 ? 'excellent' : resolutionTime < 200 ? 'good' : 'poor'}
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
          value="Server wins"
          target="Configurable"
          status="good"
        />
      </MetricsGrid>

      <SectionHeader
        title="Data Conflict Simulator"
        description="Watch how local modifications resolve against incoming server data using different strategies."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Local State</h3>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500">
                Modified
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Product Name</label>
                <input
                  type="text"
                  value={localData.productName}
                  onChange={(e) => updateLocalData('productName', e.target.value)}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
                <input
                  type="number"
                  value={localData.quantity}
                  onChange={(e) => updateLocalData('quantity', Number(e.target.value))}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Price</label>
                <input
                  type="number"
                  value={localData.price}
                  onChange={(e) => updateLocalData('price', Number(e.target.value))}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="pt-2 text-xs text-muted-foreground terminal-text">
                Last modified: {new Date(localData.lastModified).toLocaleTimeString()}
              </div>
            </div>
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
                Last sync: {new Date(serverData.lastModified).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {finalData && (
            <div className="rounded-lg border border-primary/50 bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Resolved State</h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Final
                </span>
              </div>

              <div className="space-y-3">
                <DataField label="Product Name" value={finalData.productName} highlight />
                <DataField label="Quantity" value={finalData.quantity} highlight />
                <DataField label="Price" value={`$${finalData.price}`} highlight />
                <div className="pt-2 text-xs text-muted-foreground terminal-text">
                  Resolved: {new Date(finalData.lastModified).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Conflict Log</h3>
              <button
                onClick={simulateConflict}
                disabled={isSimulating}
                className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
                {isSimulating ? 'Simulating...' : 'Simulate Conflict'}
              </button>
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto terminal-text text-xs">
              {conflictLog.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Click "Simulate Conflict" to start
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
        <h3 className="mb-4 text-lg font-semibold">Resolution Strategies</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <StrategyCard title="Server Wins" description="Server data takes precedence" active />
          <StrategyCard
            title="Local Wins"
            description="Local changes take precedence"
            active={false}
          />
          <StrategyCard title="Merge" description="Combine both with logic" active={false} />
        </div>
      </div>
    </ScenarioLayout>
  );
}

function DataField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded px-3 py-2 ${highlight ? 'bg-primary/5' : 'bg-muted/50'}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function StrategyCard({
  title,
  description,
  active,
}: {
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${active ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
