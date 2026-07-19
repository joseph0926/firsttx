import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { PlaygroundHeader } from '@/components/playground/playground-shell';
import { useI18n } from '@/hooks/use-i18n';

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
  const { locale } = useI18n();

  return (
    <div className="atlas-site-shell atlas-guide-page">
      <PlaygroundHeader />
      <main className="atlas-guide-main">
        <Link to="/" className="atlas-back-link">
          <ArrowLeft aria-hidden="true" />
          {locale === 'ko' ? 'Playground로 돌아가기' : 'Back to Playground'}
        </Link>
        <header className="atlas-guide-title">
          <div>
            <span>
              {locale === 'ko' ? '장' : 'Chapter'} {level}
            </span>
            <h1>{title}</h1>
          </div>
          {badge && (
            <div className="atlas-guide-badge">
              {badge.icon}
              {badge.label}
            </div>
          )}
        </header>
        <div className="atlas-guide-content">{children}</div>
      </main>
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
  return (
    <div className="atlas-metric-card" data-status={status}>
      <div>
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{target}</small>
    </div>
  );
}

export function MetricsGrid({ children }: { children: React.ReactNode }) {
  return <div className="atlas-metrics-grid">{children}</div>;
}

interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="atlas-content-heading">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
