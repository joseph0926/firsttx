import { useState } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

interface RequestLog {
  id: number;
  endpoint: string;
  attempt: number;
  status: 'pending' | 'timeout' | 'error-500' | 'error-503' | 'success';
  duration: number;
  timestamp: string;
}

type ChaosType = 'timeout' | '500' | '503' | 'none';

export default function NetworkChaos() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [chaosMode, setChaosMode] = useState<ChaosType>('timeout');
  const [retryCount, setRetryCount] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    retried: 0,
    failed: 0,
  });

  const runChaosTest = async () => {
    setIsRunning(true);
    setLogs([]);

    const endpoints = ['/cart/add', '/cart/update', '/checkout'];

    let totalSuccess = 0;
    let totalRetried = 0;
    let totalFailed = 0;

    for (let i = 0; i < endpoints.length; i++) {
      const result = await simulateRequest(endpoints[i]);

      if (result.success) {
        totalSuccess++;
      } else {
        totalFailed++;
      }

      if (result.retried) {
        totalRetried++;
      }

      await sleep(300);
    }

    setStats({
      total: endpoints.length,
      success: totalSuccess,
      retried: totalRetried,
      failed: totalFailed,
    });

    setIsRunning(false);
  };

  const simulateRequest = async (
    endpoint: string,
  ): Promise<{ success: boolean; retried: boolean }> => {
    const startTime = performance.now();
    let attempt = 1;

    const addLog = (status: RequestLog['status'], duration: number) => {
      setLogs((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          endpoint,
          attempt,
          status,
          duration,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    };

    const shouldFail = Math.random() < 0.4;

    if (shouldFail && chaosMode !== 'none') {
      if (chaosMode === 'timeout') {
        await sleep(5000);
        addLog('timeout', 5000);
      } else if (chaosMode === '500') {
        await sleep(200);
        addLog('error-500', 200);
      } else if (chaosMode === '503') {
        await sleep(150);
        addLog('error-503', 150);
      }

      if (retryCount > 0) {
        await sleep(300);
        attempt = 2;

        const retrySuccess = Math.random() > 0.3;

        if (retrySuccess) {
          const duration = performance.now() - startTime;
          addLog('success', Math.round(duration));
          return { success: true, retried: true };
        } else {
          if (chaosMode === 'timeout') {
            await sleep(5000);
            addLog('timeout', 5000);
          } else {
            await sleep(200);
            addLog('error-500', 200);
          }
          return { success: false, retried: true };
        }
      }

      return { success: false, retried: false };
    }

    await sleep(150);
    const duration = performance.now() - startTime;
    addLog('success', Math.round(duration));
    return { success: true, retried: false };
  };

  const resetTest = () => {
    setLogs([]);
    setStats({ total: 0, success: 0, retried: 0, failed: 0 });
  };

  return (
    <ScenarioLayout
      level={3}
      title="Network Chaos"
      badge={{
        icon: <Wifi className="h-3 w-3" />,
        label: isRunning ? 'Testing' : 'Ready',
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
          icon={<RotateCcw className="h-5 w-5" />}
          label="Retry Utilization"
          value={stats.retried.toString()}
          target={`Max ${retryCount}x per request`}
          status="good"
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Failed Requests"
          value={stats.failed.toString()}
          target="After retries"
          status={stats.failed === 0 ? 'excellent' : stats.failed < 2 ? 'good' : 'poor'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Network Instability Simulator"
        description="Test transaction behavior under unstable network conditions with timeouts, server errors, and retry logic."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Chaos Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Chaos Type</label>
                <select
                  value={chaosMode}
                  onChange={(e) => setChaosMode(e.target.value as ChaosType)}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  disabled={isRunning}
                >
                  <option value="none">None (Stable)</option>
                  <option value="timeout">Timeout (5s delay)</option>
                  <option value="500">500 Internal Server Error</option>
                  <option value="503">503 Service Unavailable</option>
                </select>
              </div>

              <div>
                <label className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Retry Attempts</span>
                  <span className="font-medium terminal-text">{retryCount}x</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  value={retryCount}
                  onChange={(e) => setRetryCount(Number(e.target.value))}
                  className="w-full"
                  disabled={isRunning}
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>No retry</span>
                  <span>3 retries</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={runChaosTest}
                  disabled={isRunning}
                  className="flex-1 flex items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Wifi className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
                  {isRunning ? 'Running Test...' : 'Run Chaos Test'}
                </button>
                <button
                  onClick={resetTest}
                  disabled={isRunning}
                  className="rounded border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Error Handling Strategy</h3>
            <div className="space-y-3 text-sm">
              <div className="rounded bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <div className="font-medium">Timeout</div>
                </div>
                <div className="text-muted-foreground text-xs">
                  Retry immediately (network may recover)
                </div>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div className="font-medium">5xx Errors</div>
                </div>
                <div className="text-muted-foreground text-xs">
                  Retry with exponential backoff (temporary server issue)
                </div>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <div className="font-medium">4xx Errors</div>
                </div>
                <div className="text-muted-foreground text-xs">
                  Fail immediately (client error, retry won't help)
                </div>
              </div>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Test Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                  <span className="text-muted-foreground">Total Requests:</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between rounded bg-green-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Succeeded:</span>
                  <span className="font-medium text-green-500">{stats.success}</span>
                </div>
                <div className="flex justify-between rounded bg-yellow-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Retried:</span>
                  <span className="font-medium text-yellow-500">{stats.retried}</span>
                </div>
                <div className="flex justify-between rounded bg-red-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-red-500">{stats.failed}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Request Log</h3>

            <div className="max-h-[500px] space-y-2 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Run a test to see request logs
                </div>
              ) : (
                logs.map((log) => <RequestLogCard key={log.id} log={log} />)
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Expected Behavior</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Automatic Retry</div>
                  <div className="text-muted-foreground">
                    Retry on timeout and 5xx errors (default 1x)
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Exponential Backoff</div>
                  <div className="text-muted-foreground">
                    Wait longer between retries (100ms → 200ms)
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Transaction Rollback</div>
                  <div className="text-muted-foreground">
                    Failed requests trigger automatic rollback
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Final Consistency</div>
                  <div className="text-muted-foreground">Only successful requests modify state</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScenarioLayout>
  );
}

function RequestLogCard({ log }: { log: RequestLog }) {
  const statusConfig = {
    pending: {
      bg: 'bg-muted/50',
      icon: Clock,
      iconColor: 'text-muted-foreground',
      label: 'Pending',
    },
    timeout: {
      bg: 'bg-yellow-500/10',
      icon: Clock,
      iconColor: 'text-yellow-500',
      label: 'Timeout',
    },
    'error-500': {
      bg: 'bg-red-500/10',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      label: '500 Error',
    },
    'error-503': {
      bg: 'bg-red-500/10',
      icon: WifiOff,
      iconColor: 'text-red-500',
      label: '503 Error',
    },
    success: {
      bg: 'bg-green-500/10',
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      label: 'Success',
    },
  };

  const config = statusConfig[log.status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border border-border p-3 ${config.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
          <span className="font-medium text-sm">{log.endpoint}</span>
        </div>
        <span className={`text-xs font-medium ${config.iconColor}`}>{config.label}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground terminal-text">
        <span>Attempt {log.attempt}</span>
        <span>{log.duration}ms</span>
        <span>{log.timestamp}</span>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
