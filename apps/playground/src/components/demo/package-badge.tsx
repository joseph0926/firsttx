import { Zap, Database, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PackageType = 'prepaint' | 'local-first' | 'tx';

interface PackageBadgeProps {
  package: PackageType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const packageConfig: Record<
  PackageType,
  { icon: typeof Zap; label: string; color: string; bgColor: string }
> = {
  prepaint: {
    icon: Zap,
    label: 'Prepaint',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  'local-first': {
    icon: Database,
    label: 'Local-First',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  tx: {
    icon: GitBranch,
    label: 'Tx',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
  },
};

export function PackageBadge({ package: pkg, size = 'md', showLabel = true }: PackageBadgeProps) {
  const config = packageConfig[pkg];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

export function PackageBadgeGroup({ packages }: { packages: PackageType[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {packages.map((pkg) => (
        <PackageBadge key={pkg} package={pkg} size="sm" />
      ))}
    </div>
  );
}
