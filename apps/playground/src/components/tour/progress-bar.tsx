import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  labels?: string[];
}

export function ProgressBar({ current, total, labels }: ProgressBarProps) {
  const progress = ((current - 1) / (total - 1)) * 100;

  return (
    <div className="w-full px-6 py-4">
      <div className="mx-auto max-w-3xl">
        <div className="relative h-2 rounded-full bg-muted">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute -top-1 left-0 flex w-full justify-between">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-4 w-4 rounded-full border-2 transition-colors',
                  i + 1 <= current
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30 bg-background',
                )}
              />
            ))}
          </div>
        </div>
        {labels && (
          <div className="mt-4 flex justify-between">
            {labels.map((label, i) => (
              <span
                key={i}
                className={cn(
                  'text-xs transition-colors',
                  i + 1 === current ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
