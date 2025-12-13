import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MetricStatus = 'bad' | 'neutral' | 'good' | 'excellent';

interface MetricBadgeProps {
  label: string;
  value: string;
  status: MetricStatus;
}

function MetricBadge({ label, value, status }: MetricBadgeProps) {
  const statusStyles: Record<MetricStatus, string> = {
    bad: 'bg-red-500/10 text-red-400 border-red-500/30',
    neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    good: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    excellent: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs',
        statusStyles[status],
      )}
    >
      <span className="font-medium">{label}:</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

interface BeforeAfterSide {
  label: string;
  description: string;
  demo: ReactNode;
  metrics?: { label: string; value: string; status: MetricStatus }[];
}

interface BeforeAfterProps {
  before: BeforeAfterSide;
  after: BeforeAfterSide;
  layout?: 'horizontal' | 'vertical';
}

export function BeforeAfter({ before, after, layout = 'horizontal' }: BeforeAfterProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div className={cn('grid gap-6', isHorizontal ? 'lg:grid-cols-2' : 'grid-cols-1')}>
      <div className="overflow-hidden rounded-xl border border-red-500/30">
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2.5">
          <span className="font-medium text-red-400">{before.label}</span>
        </div>
        <div className="p-4">
          <p className="mb-4 text-sm text-zinc-400">{before.description}</p>
          <div className="rounded-lg bg-zinc-900/50 p-4">{before.demo}</div>
          {before.metrics && before.metrics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {before.metrics.map((m) => (
                <MetricBadge key={m.label} {...m} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-green-500/30">
        <div className="border-b border-green-500/30 bg-green-500/10 px-4 py-2.5">
          <span className="font-medium text-green-400">{after.label}</span>
        </div>
        <div className="p-4">
          <p className="mb-4 text-sm text-zinc-400">{after.description}</p>
          <div className="rounded-lg bg-zinc-900/50 p-4">{after.demo}</div>
          {after.metrics && after.metrics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {after.metrics.map((m) => (
                <MetricBadge key={m.label} {...m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ComparisonTableProps {
  rows: {
    aspect: string;
    before: string;
    after: string;
    improvement?: string;
  }[];
}

export function ComparisonTable({ rows }: ComparisonTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-zinc-900/50">
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Aspect</th>
            <th className="px-4 py-3 text-left font-medium text-red-400">Before</th>
            <th className="px-4 py-3 text-left font-medium text-green-400">After</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Improvement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-300">{row.aspect}</td>
              <td className="px-4 py-3 text-zinc-400">{row.before}</td>
              <td className="px-4 py-3 text-zinc-300">{row.after}</td>
              <td className="px-4 py-3 font-medium text-green-400">{row.improvement || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
