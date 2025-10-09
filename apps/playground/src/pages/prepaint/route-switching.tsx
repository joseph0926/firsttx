import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Zap, BarChart3, Package, Settings, LayoutDashboard, Clock } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

const routes = [
  { path: '/prepaint/route-switching/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/prepaint/route-switching/products', label: 'Products', icon: Package },
  { path: '/prepaint/route-switching/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/prepaint/route-switching/settings', label: 'Settings', icon: Settings },
];

export default function RouteSwitching() {
  const location = useLocation();
  const [routeMetrics, setRouteMetrics] = useState<
    Record<string, { visits: number; avgTime: number }>
  >({});
  const [currentLoadTime, setCurrentLoadTime] = useState<number>(0);
  const [isPrepaintActive, setIsPrepaintActive] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    const hasPrepaint = document.documentElement.hasAttribute('data-prepaint');
    setIsPrepaintActive(hasPrepaint);

    const path = location.pathname;
    const stored = localStorage.getItem('route-metrics');
    const metrics = stored ? JSON.parse(stored) : {};

    setTimeout(() => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      setCurrentLoadTime(loadTime);

      const current = metrics[path] || { visits: 0, avgTime: 0 };
      const newVisits = current.visits + 1;
      const newAvgTime = (current.avgTime * current.visits + loadTime) / newVisits;

      const updated = {
        ...metrics,
        [path]: { visits: newVisits, avgTime: newAvgTime },
      };

      setRouteMetrics(updated);
      localStorage.setItem('route-metrics', JSON.stringify(updated));
    }, 50);
  }, [location.pathname]);

  const totalVisits = Object.values(routeMetrics).reduce((sum, m) => sum + m.visits, 0);
  const capturedRoutes = Object.keys(routeMetrics).length;

  return (
    <ScenarioLayout
      level={1}
      title="Route Switching"
      badge={
        isPrepaintActive
          ? {
              icon: <Zap className="h-3 w-3" />,
              label: 'Prepaint Active',
            }
          : undefined
      }
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

      <div className="mb-6 flex gap-2 rounded-lg border border-border bg-card p-2">
        {routes.map((route) => {
          const Icon = route.icon;
          const metrics = routeMetrics[route.path];
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
              {metrics && (
                <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs">
                  {metrics.visits}
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
        <h3 className="mb-4 text-lg font-semibold">Route Metrics</h3>
        <div className="space-y-2">
          {routes.map((route) => {
            const metrics = routeMetrics[route.path];
            return (
              <div
                key={route.path}
                className="flex items-center justify-between rounded bg-muted/50 px-4 py-2"
              >
                <span className="text-sm font-medium">{route.label}</span>
                {metrics ? (
                  <div className="flex gap-4 text-xs text-muted-foreground terminal-text">
                    <span>{metrics.visits} visits</span>
                    <span>avg: {metrics.avgTime.toFixed(1)}ms</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Not visited</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScenarioLayout>
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
