import { useCallback, useState } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle2, Clock, RotateCcw, Zap } from 'lucide-react';
import { DemoLayout, MetricsGrid, MetricCard, SectionHeader } from '@/components/demo';
import { useTx } from '@firsttx/tx';
import { sleep } from '@/lib/utils';
import { getDemoById, getRelatedDemos } from '@/data/learning-paths';

const demoMeta = getDemoById('network-chaos')!;
const relatedDemos = getRelatedDemos('network-chaos', 2);

interface RequestLog {
  id: number;
  endpoint: string;
  attempt: number;
  status: 'pending' | 'running' | 'retry' | 'success' | 'failed' | 'rolled-back';
  duration: number;
  timestamp: string;
  message: string;
}

type ChaosType = 'timeout' | '500' | '503' | 'none';

type ChaosVariables = {
  endpoint: string;
  chaosMode: ChaosType;
  attemptRef: { current: number };
  maxAttempts: number;
};

type RequestResult = {
  attempt: number;
  duration: number;
};

export default function NetworkChaos() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [chaosMode, setChaosMode] = useState<ChaosType>('timeout');
  const [retryCount, setRetryCount] = useState(1);
  const [retryDelay, setRetryDelay] = useState(300);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    retried: 0,
    failed: 0,
  });

  const pushLog = useCallback((entry: Omit<RequestLog, 'id' | 'timestamp'>) => {
    setLogs((prev) => [
      ...prev,
      {
        ...entry,
        id: prev.length + 1,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  const maxAttempts = retryCount + 1;

  const { mutateAsync: executeRequest } = useTx<ChaosVariables, RequestResult>({
    optimistic: async ({ endpoint }) => {
      pushLog({
        endpoint,
        attempt: 1,
        status: 'pending',
        duration: 0,
        message: 'Optimistic state applied',
      });
    },
    rollback: async ({ endpoint, attemptRef }) => {
      pushLog({
        endpoint,
        attempt: attemptRef.current || 1,
        status: 'rolled-back',
        duration: 0,
        message: 'Rollback executed',
      });
    },
    request: async (variables) => {
      const attempt = ++variables.attemptRef.current;
      const start = performance.now();

      pushLog({
        endpoint: variables.endpoint,
        attempt,
        status: 'running',
        duration: 0,
        message: `Attempt ${attempt}`,
      });

      try {
        await simulateChaosRequest(variables.chaosMode, attempt, variables.maxAttempts);
        const duration = performance.now() - start;
        return { attempt, duration };
      } catch (error) {
        if (attempt < variables.maxAttempts) {
          pushLog({
            endpoint: variables.endpoint,
            attempt,
            status: 'retry',
            duration: Math.round(performance.now() - start),
            message: (error as Error).message,
          });
        }
        throw error;
      }
    },
    retry: {
      maxAttempts,
      delayMs: retryDelay,
      backoff: 'linear',
    },
    onSuccess: (result, variables) => {
      pushLog({
        endpoint: variables.endpoint,
        attempt: result.attempt,
        status: 'success',
        duration: Math.round(result.duration),
        message: 'Server confirmed',
      });
    },
    onError: (error, variables) => {
      pushLog({
        endpoint: variables.endpoint,
        attempt: variables.attemptRef.current,
        status: 'failed',
        duration: 0,
        message: error.message,
      });
    },
  });

  const runChaosTest = async () => {
    setIsRunning(true);
    setLogs([]);

    const endpoints = ['/cart/add', '/cart/update', '/checkout'];

    let totalSuccess = 0;
    let totalRetried = 0;
    let totalFailed = 0;

    for (const endpoint of endpoints) {
      const attemptRef = { current: 0 };
      try {
        await executeRequest({
          endpoint,
          chaosMode,
          attemptRef,
          maxAttempts,
        });
        totalSuccess++;
        if (attemptRef.current > 1) {
          totalRetried++;
        }
      } catch {
        totalFailed++;
        if (attemptRef.current > 1) {
          totalRetried++;
        }
      }

      await sleep(150);
    }

    setStats({
      total: endpoints.length,
      success: totalSuccess,
      retried: totalRetried,
      failed: totalFailed,
    });

    setIsRunning(false);
  };

  const resetTest = () => {
    setLogs([]);
    setStats({ total: 0, success: 0, retried: 0, failed: 0 });
  };

  const successRate =
    stats.total === 0 ? '--' : `${Math.round((stats.success / stats.total) * 100)}%`;

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
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Success Rate"
          value={successRate}
          target={`${stats.success}/${stats.total}`}
          status={
            stats.total === 0
              ? 'good'
              : stats.success / stats.total > 0.7
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
          target={`Max ${maxAttempts - 1}x per request`}
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
        description="Each request runs inside useTx with configurable retry + backoff. Toggle chaos types to see how transactions respond."
      />

      <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Zap className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm">
            <div className="font-medium text-blue-400">Try This</div>
            <div className="text-muted-foreground">
              Adjust the chaos type and retry settings, then run the test. See how auto-retry and
              rollback work under network error conditions.
            </div>
          </div>
        </div>
      </div>

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
                  <option value="timeout">Timeout (Always fail)</option>
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

              <div>
                <label className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Retry Delay (ms)</span>
                  <span className="font-medium terminal-text">{retryDelay}ms</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="1500"
                  step="100"
                  value={retryDelay}
                  onChange={(e) => setRetryDelay(Number(e.target.value))}
                  className="w-full"
                  disabled={isRunning}
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>100ms</span>
                  <span>1500ms</span>
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
                <div className="mb-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <div className="font-medium">Timeout</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Always fails – verify rollback/consistency even after retries.
                </div>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div className="font-medium">500 Errors</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Recovers after the 2nd attempt. Increase retries to watch success rate climb.
                </div>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <div className="font-medium">503 Errors</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Needs three attempts (or fewer if you cut retries) to settle.
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
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Automatic Retry</div>
                  <div className="text-muted-foreground">
                    Tx retries server steps while keeping optimistic UI consistent.
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Backoff Control</div>
                  <div className="text-muted-foreground">
                    Adjust delay to mimic exponential or aggressive retries.
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Rollback Safety</div>
                  <div className="text-muted-foreground">
                    When retries exhaust, rollback restores the previous model snapshot.
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Final Consistency</div>
                  <div className="text-muted-foreground">
                    Only successful transactions mutate state or logs.
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

function RequestLogCard({ log }: { log: RequestLog }) {
  const statusConfig = {
    pending: {
      bg: 'bg-muted/50',
      icon: Clock,
      iconColor: 'text-muted-foreground',
      label: 'Pending',
    },
    running: {
      bg: 'bg-blue-500/10',
      icon: RotateCcw,
      iconColor: 'text-blue-500',
      label: 'In-flight',
    },
    retry: {
      bg: 'bg-yellow-500/10',
      icon: Clock,
      iconColor: 'text-yellow-500',
      label: 'Retry scheduled',
    },
    success: {
      bg: 'bg-green-500/10',
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      label: 'Success',
    },
    failed: {
      bg: 'bg-red-500/10',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      label: 'Failed',
    },
    'rolled-back': {
      bg: 'bg-muted/30',
      icon: WifiOff,
      iconColor: 'text-muted-foreground',
      label: 'Rolled back',
    },
  } as const;

  const config = statusConfig[log.status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border border-border p-3 ${config.bg}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2 ${config.iconColor} bg-background/80`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{log.endpoint}</span>
            <span className="text-xs uppercase text-muted-foreground">{config.label}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Attempt #{log.attempt} · {log.duration}ms · {log.timestamp}
          </div>
          <div className="text-xs text-muted-foreground">{log.message}</div>
        </div>
      </div>
    </div>
  );
}

async function simulateChaosRequest(
  mode: ChaosType,
  attempt: number,
  maxAttempts: number,
): Promise<void> {
  if (mode === 'none') {
    await sleep(200 + Math.random() * 150);
    return;
  }

  if (mode === 'timeout') {
    await sleep(1200);
    throw new Error('Timeout');
  }

  if (mode === '500') {
    await sleep(200);
    const requiredAttempts = Math.min(2, maxAttempts);
    if (attempt < requiredAttempts) {
      throw new Error('HTTP 500');
    }
    return;
  }

  if (mode === '503') {
    await sleep(250);
    const requiredAttempts = Math.min(3, maxAttempts);
    if (attempt < requiredAttempts) {
      throw new Error('HTTP 503');
    }
    return;
  }

  throw new Error('Unknown chaos mode');
}
