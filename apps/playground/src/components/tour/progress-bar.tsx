import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  labels?: string[];
}

export function ProgressBar({ current, total, labels }: ProgressBarProps) {
  const progress = ((current - 1) / (total - 1)) * 100;
  const currentLabel = labels?.[current - 1];

  return (
    <div
      className="atlas-tour-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-valuetext={
        currentLabel ? `${currentLabel} (${current}/${total})` : `${current}/${total}`
      }
    >
      <div>
        <p className="atlas-tour-progress-summary" aria-hidden="true">
          {currentLabel} · {current}/{total}
        </p>
        <div className="atlas-tour-track">
          <div
            className="atlas-tour-track-value"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
          <div className="atlas-tour-stops">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={cn('atlas-tour-stop', i + 1 <= current ? 'is-complete' : undefined)}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        {labels && (
          <div className="atlas-tour-step-labels">
            {labels.map((label, i) => (
              <span
                key={i}
                className={cn(i + 1 === current ? 'is-current' : undefined)}
                aria-current={i + 1 === current ? 'step' : undefined}
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
