import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Database, Wifi } from 'lucide-react';
import { TourStep, TourCard } from '@/components/tour';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

function BlankScreenDemo() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const simulateRefresh = () => {
    setShowContent(false);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
    }, 2000);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex h-32 items-center justify-center rounded-lg border transition-all',
          isLoading
            ? 'border-red-500/50 bg-zinc-900'
            : showContent
              ? 'border-green-500/30 bg-zinc-900/50'
              : 'border-border bg-zinc-900/50',
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            <span className="text-sm text-red-400">{t('common.loading')}</span>
          </div>
        ) : showContent ? (
          <div className="text-center">
            <div className="mb-1 text-2xl">🎉</div>
            <span className="text-sm text-green-400">{t('common.contentLoaded')}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t('common.clickRefreshToSimulate')}
          </span>
        )}
      </div>
      <button
        onClick={simulateRefresh}
        className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-700"
      >
        {t('common.refresh')}
      </button>
    </div>
  );
}

function DataLossDemo() {
  const { t } = useI18n();
  const [count, setCount] = useState(0);
  const [isLost, setIsLost] = useState(false);

  const simulateNavigation = () => {
    if (count > 0) {
      setIsLost(true);
      setTimeout(() => {
        setCount(0);
        setIsLost(false);
      }, 1500);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-zinc-900/50 p-4">
        <span className="text-sm">{t('common.cartItems')}:</span>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-2xl font-bold transition-colors',
              isLost ? 'text-red-400' : 'text-foreground',
            )}
          >
            {isLost ? '0' : count}
          </span>
          <button
            onClick={() => setCount((c) => c + 1)}
            disabled={isLost}
            className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            +1
          </button>
        </div>
      </div>
      {isLost && (
        <div className="text-center text-sm text-red-400">{t('common.dataLostOnNavigation')}</div>
      )}
      <button
        onClick={simulateNavigation}
        className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-700"
      >
        {t('common.navigateAway')}
      </button>
    </div>
  );
}

function NetworkErrorDemo() {
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const simulateRequest = () => {
    setStatus('loading');
    setTimeout(() => {
      setStatus('error');
    }, 1500);
  };

  const retry = () => {
    setStatus('idle');
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex h-24 items-center justify-center rounded-lg border transition-all',
          status === 'error' ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-zinc-900/50',
        )}
      >
        {status === 'idle' && (
          <span className="text-sm text-muted-foreground">{t('common.readyToSubmit')}</span>
        )}
        {status === 'loading' && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">{t('common.submitting')}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="text-center">
            <div className="mb-1 text-red-400">{t('common.networkError')}</div>
            <button onClick={retry} className="text-xs text-muted-foreground hover:text-foreground">
              {t('common.manualRetryRequired')}
            </button>
          </div>
        )}
      </div>
      <button
        onClick={simulateRequest}
        disabled={status === 'loading'}
        className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {t('common.submitForm')}
      </button>
    </div>
  );
}

export default function StepProblem() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <TourStep
      title={t('tour.problem.title')}
      description={t('tour.problem.description')}
      icon={<AlertTriangle className="h-8 w-8" />}
    >
      <div
        className={cn(
          'grid gap-6 transition-opacity duration-500 md:grid-cols-3',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      >
        <TourCard
          title={t('tour.problem.blankScreenOnRefresh')}
          description={t('tour.problem.blankScreenOnRefreshDescription')}
          icon={<Clock className="h-5 w-5" />}
          variant="problem"
        >
          <BlankScreenDemo />
        </TourCard>

        <TourCard
          title={t('tour.problem.dataLostOnNavigation')}
          description={t('tour.problem.dataLostOnNavigationDescription')}
          icon={<Database className="h-5 w-5" />}
          variant="problem"
        >
          <DataLossDemo />
        </TourCard>

        <TourCard
          title={t('tour.problem.manualErrorRecovery')}
          description={t('tour.problem.manualErrorRecoveryDescription')}
          icon={<Wifi className="h-5 w-5" />}
          variant="problem"
        >
          <NetworkErrorDemo />
        </TourCard>
      </div>
    </TourStep>
  );
}
