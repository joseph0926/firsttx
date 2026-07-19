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
    <div className="atlas-tour-navigation">
      <div>
        <div>
          {onPrev && (
            <button onClick={onPrev} className="atlas-button atlas-button-tertiary">
              <ArrowLeft className="h-4 w-4" />
              {prevLabel}
            </button>
          )}
        </div>

        <div className="atlas-tour-actions">
          {onSkip && !isLastStep && (
            <button
              onClick={onSkip}
              className={cn(
                'atlas-button',
                isFirstStep ? 'atlas-button-secondary' : 'atlas-button-tertiary',
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
                'atlas-button atlas-button-primary',
                isLastStep ? 'is-complete' : undefined,
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
