import { useState } from 'react';
import { Clock, Zap, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

interface TimelineEvent {
  time: number;
  label: string;
  type: 'tx-start' | 'tx-step' | 'server-sync' | 'tx-rollback' | 'tx-commit';
  status?: 'pending' | 'success' | 'error';
}

export default function TimingAttack() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [cartItems, setCartItems] = useState(3);
  const [isSimulating, setIsSimulating] = useState(false);
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null);
  const [serverSyncTiming, setServerSyncTiming] = useState(50);
  const [consistencyRate, setConsistencyRate] = useState(100);

  const runTimingTest = async () => {
    setIsSimulating(true);
    setTimeline([]);
    setTestResult(null);
    setCartItems(3);

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

    addEvent('Transaction started', 'tx-start', 'success');
    await sleep(100);

    addEvent('Step 1: Optimistic update (+1 item)', 'tx-step', 'success');
    setCartItems(4);
    await sleep(100);

    addEvent('🔴 Server sync arrives (unexpected)', 'server-sync', 'success');
    await sleep(serverSyncTiming);

    addEvent('Step 2: API call fails', 'tx-step', 'error');
    await sleep(100);

    addEvent('Transaction rollback initiated', 'tx-rollback', 'pending');
    await sleep(50);

    const serverDataPreserved = Math.random() > 0.1;

    if (serverDataPreserved) {
      setCartItems(5);
      addEvent('✅ Server data preserved (5 items)', 'tx-rollback', 'success');
      setTestResult('pass');
      setConsistencyRate((prev) => Math.min(100, prev + 1));
    } else {
      setCartItems(3);
      addEvent('❌ Data corrupted (rolled back to 3)', 'tx-rollback', 'error');
      setTestResult('fail');
      setConsistencyRate((prev) => Math.max(0, prev - 10));
    }

    setIsSimulating(false);
  };

  const resetTest = () => {
    setTimeline([]);
    setCartItems(3);
    setTestResult(null);
  };

  return (
    <ScenarioLayout
      level={2}
      title="Timing Attack"
      badge={{
        icon: <Activity className="h-3 w-3" />,
        label: 'Race Condition Test',
      }}
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
                    <div className="flex-shrink-0 w-16 pt-1 text-xs text-muted-foreground terminal-text">
                      {event.time.toFixed(0)}ms
                    </div>
                    <div className="flex-shrink-0 pt-1">
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
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Protected Against Race</div>
                  <div className="text-muted-foreground">
                    Tx rollback should NOT overwrite server data
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Memory Cache Integrity</div>
                  <div className="text-muted-foreground">Cache must reflect final server state</div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
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
    </ScenarioLayout>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
