import { useState, useEffect } from 'react';
import { Clock, AlertCircle, RefreshCw, CheckCircle2, Calendar } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

interface DataSnapshot {
  value: string;
  timestamp: number;
  age: number;
  isStale: boolean;
  lastSyncStatus: 'success' | 'failed' | 'pending';
}

export default function StalenessDetection() {
  const [snapshot, setSnapshot] = useState<DataSnapshot>({
    value: 'Product data loaded',
    timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
    age: 6,
    isStale: false,
    lastSyncStatus: 'success',
  });

  const [ttlDays, setTtlDays] = useState(7);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'slow'>('online');
  const [syncAttempts, setSyncAttempts] = useState(0);
  const [userDecision, setUserDecision] = useState<'continue' | 'refresh' | 'error' | null>(null);

  useEffect(() => {
    const ageInDays = Math.floor((Date.now() - snapshot.timestamp) / (24 * 60 * 60 * 1000));
    const isStale = ageInDays >= ttlDays;

    setSnapshot((prev) => ({
      ...prev,
      age: ageInDays,
      isStale,
    }));
  }, [snapshot.timestamp, ttlDays]);

  const simulateAging = (days: number) => {
    setSnapshot((prev) => ({
      ...prev,
      timestamp: Date.now() - days * 24 * 60 * 60 * 1000,
    }));
    setUserDecision(null);
  };

  const attemptRefresh = async () => {
    setSyncAttempts((prev) => prev + 1);
    setSnapshot((prev) => ({ ...prev, lastSyncStatus: 'pending' }));

    await sleep(1000);

    if (serverStatus === 'offline') {
      setSnapshot((prev) => ({
        ...prev,
        lastSyncStatus: 'failed',
      }));
      setUserDecision('error');
    } else if (serverStatus === 'slow') {
      await sleep(2000);
      setSnapshot({
        value: 'Fresh data from server',
        timestamp: Date.now(),
        age: 0,
        isStale: false,
        lastSyncStatus: 'success',
      });
      setUserDecision('refresh');
    } else {
      setSnapshot({
        value: 'Fresh data from server',
        timestamp: Date.now(),
        age: 0,
        isStale: false,
        lastSyncStatus: 'success',
      });
      setUserDecision('refresh');
    }
  };

  const continueWithStale = () => {
    setUserDecision('continue');
  };

  return (
    <ScenarioLayout
      level={2}
      title="Staleness Detection"
      badge={{
        icon: <Clock className="h-3 w-3" />,
        label: snapshot.isStale ? 'Stale Data' : 'Fresh Data',
      }}
    >
      <MetricsGrid>
        <MetricCard
          icon={<Calendar className="h-5 w-5" />}
          label="Data Age"
          value={`${snapshot.age} days`}
          target={`TTL: ${ttlDays} days`}
          status={
            snapshot.age < ttlDays ? 'excellent' : snapshot.age < ttlDays * 1.5 ? 'good' : 'poor'
          }
        />
        <MetricCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Staleness Status"
          value={snapshot.isStale ? 'Stale' : 'Fresh'}
          target="Within TTL"
          status={snapshot.isStale ? 'poor' : 'excellent'}
        />
        <MetricCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Sync Attempts"
          value={syncAttempts.toString()}
          target={snapshot.lastSyncStatus === 'failed' ? 'Retry available' : 'Success'}
          status={snapshot.lastSyncStatus === 'failed' ? 'poor' : 'good'}
        />
      </MetricsGrid>

      <SectionHeader
        title="TTL & Staleness Simulator"
        description="Test how FirstTx handles expired data, failed syncs, and user decisions when data becomes stale."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Data State</h3>

            <div
              className={`mb-4 rounded-lg p-6 text-center ${
                snapshot.isStale
                  ? 'bg-yellow-500/10 border border-yellow-500/20'
                  : 'bg-green-500/10 border border-green-500/20'
              }`}
            >
              <div className="mb-2 text-sm text-muted-foreground">Current Value</div>
              <div className="text-lg font-medium">{snapshot.value}</div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium terminal-text">
                  {new Date(snapshot.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Age:</span>
                <span
                  className={`font-medium ${snapshot.isStale ? 'text-yellow-500' : 'text-green-500'}`}
                >
                  {snapshot.age} days old
                </span>
              </div>
              <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">TTL Threshold:</span>
                <span className="font-medium">{ttlDays} days</span>
              </div>
              <div className="flex justify-between rounded bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Last Sync:</span>
                <span
                  className={`font-medium ${
                    snapshot.lastSyncStatus === 'success'
                      ? 'text-green-500'
                      : snapshot.lastSyncStatus === 'failed'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}
                >
                  {snapshot.lastSyncStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Test Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Simulate Data Age</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => simulateAging(3)}
                    className="rounded border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
                  >
                    3 days
                  </button>
                  <button
                    onClick={() => simulateAging(8)}
                    className="rounded border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
                  >
                    8 days
                  </button>
                  <button
                    onClick={() => simulateAging(14)}
                    className="rounded border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
                  >
                    14 days
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">TTL Configuration</label>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={ttlDays}
                  onChange={(e) => setTtlDays(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>1 day</span>
                  <span>{ttlDays} days</span>
                  <span>14 days</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Server Status</label>
                <select
                  value={serverStatus}
                  onChange={(e) => setServerStatus(e.target.value as 'online' | 'offline' | 'slow')}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="online">Online (fast)</option>
                  <option value="slow">Online (slow - 3s)</option>
                  <option value="offline">Offline (500 error)</option>
                </select>
              </div>
            </div>
          </div>

          {snapshot.isStale && !userDecision && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-6">
              <div className="mb-4 flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                <div>
                  <h4 className="font-semibold">Stale Data Detected</h4>
                  <p className="text-sm text-muted-foreground">
                    Data is {snapshot.age} days old (TTL: {ttlDays} days)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={continueWithStale}
                  className="flex-1 rounded border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Continue with stale data
                </button>
                <button
                  onClick={attemptRefresh}
                  disabled={snapshot.lastSyncStatus === 'pending'}
                  className="flex-1 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {snapshot.lastSyncStatus === 'pending' ? 'Syncing...' : 'Force refresh'}
                </button>
              </div>
            </div>
          )}

          {userDecision && (
            <div
              className={`rounded-lg border p-6 ${
                userDecision === 'refresh'
                  ? 'border-green-500/50 bg-green-500/5'
                  : userDecision === 'error'
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-yellow-500/50 bg-yellow-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {userDecision === 'refresh' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                {userDecision === 'error' && <AlertCircle className="h-6 w-6 text-red-500" />}
                {userDecision === 'continue' && <AlertCircle className="h-6 w-6 text-yellow-500" />}
                <div>
                  <h4 className="font-semibold">
                    {userDecision === 'refresh' && 'Data Refreshed'}
                    {userDecision === 'error' && 'Refresh Failed'}
                    {userDecision === 'continue' && 'Proceeding with Stale Data'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {userDecision === 'refresh' && 'Successfully synced with server'}
                    {userDecision === 'error' && 'Server unavailable - using cached data'}
                    {userDecision === 'continue' && 'User chose to continue without refresh'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Handling Strategy</h3>
            <div className="space-y-4">
              <StrategyCard
                step="1"
                title="Detect Staleness"
                description="Compare data age against TTL threshold"
                status={snapshot.isStale ? 'active' : 'complete'}
              />
              <StrategyCard
                step="2"
                title="User Notification"
                description="Show banner: 'Data may be outdated'"
                status={
                  snapshot.isStale && !userDecision
                    ? 'active'
                    : snapshot.isStale
                      ? 'complete'
                      : 'pending'
                }
              />
              <StrategyCard
                step="3"
                title="Attempt Sync"
                description="Try to fetch fresh data from server"
                status={
                  userDecision === 'refresh'
                    ? 'complete'
                    : userDecision === 'error'
                      ? 'error'
                      : 'pending'
                }
              />
              <StrategyCard
                step="4"
                title="Fallback Decision"
                description="Continue with stale or show error"
                status={userDecision ? 'complete' : 'pending'}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Best Practices</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Clear UI Feedback</div>
                  <div className="text-muted-foreground">Show data age and staleness warnings</div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">User Control</div>
                  <div className="text-muted-foreground">Let users decide: continue or refresh</div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Graceful Degradation</div>
                  <div className="text-muted-foreground">
                    Function with stale data when server fails
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

interface StrategyCardProps {
  step: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

function StrategyCard({ step, title, description, status }: StrategyCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        status === 'active'
          ? 'border-primary bg-primary/5'
          : status === 'complete'
            ? 'border-green-500/50 bg-green-500/5'
            : status === 'error'
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            status === 'active'
              ? 'bg-primary text-primary-foreground'
              : status === 'complete'
                ? 'bg-green-500 text-white'
                : status === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-muted text-muted-foreground'
          }`}
        >
          {status === 'complete' ? '✓' : status === 'error' ? '✗' : step}
        </div>
        <div className="flex-1">
          <h4 className="mb-1 font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
