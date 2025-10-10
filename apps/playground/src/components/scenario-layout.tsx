import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface ScenarioLayoutProps {
  level: number;
  title: string;
  badge?: {
    icon: React.ReactNode;
    label: string;
  };
  children: React.ReactNode;
}

export function ScenarioLayout({ level, title, badge, children }: ScenarioLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Arena
              </Link>
              <div className="h-4 w-px bg-border" />
              <div>
                <div className="text-xs text-muted-foreground terminal-text">LEVEL {level}</div>
                <div className="text-sm font-semibold">{title}</div>
              </div>
            </div>

            {badge && (
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {badge.icon}
                {badge.label}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  target: string;
  status?: 'excellent' | 'good' | 'poor';
}

export function MetricCard({ icon, label, value, target, status = 'good' }: MetricCardProps) {
  const statusColors = {
    excellent: 'text-green-500 dark:text-green-400',
    good: 'text-yellow-500 dark:text-yellow-400',
    poor: 'text-red-500 dark:text-red-400',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className={`mb-1 text-3xl font-bold ${statusColors[status]}`}>{value}</div>
      <div className="text-xs text-muted-foreground terminal-text">{target}</div>
    </div>
  );
}

interface MetricsGridProps {
  children: React.ReactNode;
}

export function MetricsGrid({ children }: MetricsGridProps) {
  return <div className="mb-8 grid gap-4 md:grid-cols-3">{children}</div>;
}

interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="mb-2 text-3xl font-bold">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
