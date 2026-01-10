import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepNavigationProps {
  onPrev?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  skipLabel?: string;
  isLastStep?: boolean;
  isFirstStep?: boolean;
}

export function StepNavigation({
  onPrev,
  onNext,
  onSkip,
  nextLabel = 'Next',
  prevLabel = 'Back',
  skipLabel = 'Skip Tour',
  isLastStep = false,
  isFirstStep = false,
}: StepNavigationProps) {
  return (
    <div className="border-t border-border bg-card/50 px-6 py-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div>
          {onPrev && (
            <button
              onClick={onPrev}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {prevLabel}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSkip && !isLastStep && (
            <button
              onClick={onSkip}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
                isFirstStep
                  ? 'border border-border text-foreground hover:bg-muted'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {skipLabel}
              <SkipForward className="h-4 w-4" />
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className={cn(
                'flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-colors',
                isLastStep
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
