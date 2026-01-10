import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TourStepProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function TourStep({ title, description, icon, children, className }: TourStepProps) {
  return (
    <div className={cn('w-full max-w-4xl', className)}>
      <div className="mb-8 text-center">
        {icon && (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description && (
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface TourCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  variant?: 'default' | 'problem' | 'solution';
}

export function TourCard({
  title,
  description,
  icon,
  children,
  variant = 'default',
}: TourCardProps) {
  const variantStyles = {
    default: 'border-border bg-card',
    problem: 'border-red-500/30 bg-red-500/5',
    solution: 'border-green-500/30 bg-green-500/5',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    problem: 'text-red-400',
    solution: 'text-green-400',
  };

  return (
    <div className={cn('rounded-xl border p-6', variantStyles[variant])}>
      <div className="mb-4 flex items-start gap-4">
        {icon && <div className={cn('mt-0.5', iconStyles[variant])}>{icon}</div>}
        <div className="flex-1">
          <h3 className="mb-1 font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
