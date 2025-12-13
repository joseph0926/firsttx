import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Zap, BarChart3, Package, Settings, LayoutDashboard, Clock, RefreshCw } from 'lucide-react';
import { DemoLayout, MetricsGrid, MetricCard, SectionHeader } from '@/components/demo';
import { useSyncedModel } from '@firsttx/local-first';
import { RouteMetricsModel, type RouteMetricsData } from '../../models/route-metrics.model';
import { fetchRouteMetrics } from '@/api/route-metrics.api';
import { useHandoffStrategy } from '@/lib/prepaint-handshake';
import { getDemoById, getRelatedDemos } from '@/data/learning-paths';

const demoMeta = getDemoById('route-switching')!;
const relatedDemos = getRelatedDemos('route-switching', 2);

const routes = [
  { path: '/prepaint/route-switching/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/prepaint/route-switching/products', label: 'Products', icon: Package },
  { path: '/prepaint/route-switching/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/prepaint/route-switching/settings', label: 'Settings', icon: Settings },
];

export default function RouteSwitching() {
  const location = useLocation();
  const {
    data: routeMetrics,
    patch,
    sync,
    isSyncing,
    error,
  } = useSyncedModel(RouteMetricsModel, fetchRouteMetrics);

  const [currentLoadTime, setCurrentLoadTime] = useState<number>(0);
  useHandoffStrategy();

  useEffect(() => {
    const startTime = performance.now();
    const path = location.pathname;

    const timeoutId = setTimeout(() => {
      const loadTime = performance.now() - startTime;
      setCurrentLoadTime(loadTime);

      const cachedMetrics = RouteMetricsModel.getCachedSnapshot() ?? ({} as RouteMetricsData);
      const current = cachedMetrics[path] || { visits: 0, avgTime: 0 };
      const newVisits = current.visits + 1;
      const newAvgTime = (current.avgTime * current.visits + loadTime) / newVisits;

      patch((draft) => {
        draft[path] = {
          visits: newVisits,
          avgTime: newAvgTime,
        };
      }).catch(() => {});
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, patch]);

  const metrics = routeMetrics || {};
  const totalVisits = Object.values(metrics).reduce((sum, m) => sum + m.visits, 0);
  const capturedRoutes = Object.keys(metrics).length;

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
          label="Current Load Time"
          value={`${currentLoadTime.toFixed(1)}ms`}
          target="<20ms"
          status={currentLoadTime < 20 ? 'excellent' : currentLoadTime < 50 ? 'good' : 'poor'}
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Total Visits"
          value={totalVisits.toString()}
          target={`${capturedRoutes}/4 routes captured`}
          status="good"
        />
        <MetricCard
          icon={<Zap className="h-5 w-5" />}
          label="Snapshot Coverage"
          value={`${Math.round((capturedRoutes / 4) * 100)}%`}
          target="Visit all routes"
          status={capturedRoutes >= 3 ? 'excellent' : 'good'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Multi-Route Navigation"
        description="Switch between routes to see how prepaint captures and restores each page independently."
      />

      <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Zap className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm">
            <div className="font-medium text-blue-400">Try This</div>
            <div className="text-muted-foreground">
              After visiting each route, refresh the browser or navigate away and return. Visited
              routes are instantly restored.
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-2 rounded-lg border border-border bg-card p-2">
        {routes.map((route) => {
          const Icon = route.icon;
          const metric = metrics[route.path];
          return (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) =>
                `flex flex-1 items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{route.label}</span>
              {metric && (
                <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs">
                  {metric.visits}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <Outlet />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Route Metrics</h3>
          <button
            onClick={() => sync()}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with Server'}
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded bg-destructive/10 p-3 text-sm text-destructive">
            Sync failed: {error.message}
          </div>
        )}
        <div className="space-y-2">
          {routes.map((route) => {
            const metric = metrics[route.path];
            return (
              <div
                key={route.path}
                className="flex items-center justify-between rounded bg-muted/50 px-4 py-2"
              >
                <span className="text-sm font-medium">{route.label}</span>
                {metric ? (
                  <div className="flex gap-4 text-xs text-muted-foreground terminal-text">
                    <span>{metric.visits} visits</span>
                    <span>avg: {metric.avgTime.toFixed(1)}ms</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Not visited</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DemoLayout>
  );
}

export function DashboardRoute() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-muted/50 p-6">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Total Revenue</h3>
          <div className="text-3xl font-bold">$142,593</div>
          <div className="mt-1 text-xs text-green-500">+12.5% from last month</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-6">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Active Users</h3>
          <div className="text-3xl font-bold">2,847</div>
          <div className="mt-1 text-xs text-green-500">+8.2% from last week</div>
        </div>
      </div>
    </div>
  );
}

export function ProductsRoute() {
  const products = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    stock: Math.floor(Math.random() * 100),
    price: Math.floor(Math.random() * 500) + 50,
  }));

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Products</h2>
      <div className="space-y-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between rounded bg-muted/50 px-4 py-3"
          >
            <div>
              <div className="font-medium">{product.name}</div>
              <div className="text-xs text-muted-foreground">Stock: {product.stock}</div>
            </div>
            <div className="text-lg font-bold">${product.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsRoute() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Analytics</h2>
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-6">
          <h3 className="mb-2 font-semibold">Traffic Sources</h3>
          <div className="space-y-2">
            {['Direct', 'Organic Search', 'Social Media', 'Referral'].map((source, i) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm">{source}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(4 - i) * 25}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground terminal-text">
                    {(4 - i) * 25}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsRoute() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Settings</h2>
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="mb-2 font-semibold">Notification Preferences</h3>
          <div className="space-y-2">
            {['Email notifications', 'Push notifications', 'SMS alerts'].map((pref) => (
              <label key={pref} className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm">{pref}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="mb-2 font-semibold">Account Settings</h3>
          <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            Update Profile
          </button>
        </div>
      </div>
    </div>
  );
}
