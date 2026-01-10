import { useState, useEffect, useRef } from 'react';
import { Zap, Clock } from 'lucide-react';
import { TourStep } from '@/components/tour';
import { BeforeAfter } from '@/components/demo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

function TraditionalDemo() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const simulateLoad = () => {
    setShowContent(false);
    setIsLoading(true);
    setLoadTime(null);
    startTimeRef.current = performance.now();

    setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
      setLoadTime(performance.now() - startTimeRef.current);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('common.loadTime')}:</span>
        <span className={cn('font-mono', loadTime ? 'text-red-400' : 'text-muted-foreground')}>
          {loadTime ? `${loadTime.toFixed(0)}ms` : '--'}
        </span>
      </div>

      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-lg border transition-all',
          isLoading ? 'border-red-500/30 bg-zinc-950' : 'border-border bg-zinc-900/50',
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            <span className="text-sm text-muted-foreground">{t('common.blankScreen')}</span>
          </div>
        ) : showContent ? (
          <div className="grid w-full grid-cols-3 gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-zinc-800" />
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t('common.clickRefreshToSimulate')}
          </span>
        )}
      </div>

      <button
        onClick={simulateLoad}
        disabled={isLoading}
        className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {t('common.refreshPage')}
      </button>
    </div>
  );
}

function PrepaintDemo() {
  const { t } = useI18n();
  const [isRestoring, setIsRestoring] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [visitCount, setVisitCount] = useState(1);

  const simulateLoad = () => {
    setIsRestoring(true);
    const start = performance.now();

    setTimeout(() => {
      setIsRestoring(false);
      setLoadTime(performance.now() - start);
      setVisitCount((c) => c + 1);
    }, 15);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('common.loadTime')}:</span>
        <span className={cn('font-mono', loadTime ? 'text-green-400' : 'text-muted-foreground')}>
          {loadTime ? `${loadTime.toFixed(0)}ms` : '--'}
        </span>
      </div>

      <div
        className={cn(
          'relative flex h-48 items-center justify-center rounded-lg border transition-all',
          isRestoring ? 'border-green-500/50 bg-zinc-900/50' : 'border-green-500/20 bg-zinc-900/50',
        )}
      >
        {isRestoring && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/5">
            <div className="flex items-center gap-2 text-green-400">
              <Zap className="h-4 w-4" />
              <span className="text-sm">{t('common.restoringSnapshot')}</span>
            </div>
          </div>
        )}
        <div className="grid w-full grid-cols-3 gap-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-zinc-800" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t('common.visit')} #{visitCount}
        </span>
        <button
          onClick={simulateLoad}
          disabled={isRestoring}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {t('common.refreshPage')}
        </button>
      </div>
    </div>
  );
}

export default function StepPrepaint() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <TourStep
      title={t('tour.prepaint.title')}
      description={t('tour.prepaint.description')}
      icon={<Zap className="h-8 w-8" />}
    >
      <div className={cn('transition-opacity duration-500', mounted ? 'opacity-100' : 'opacity-0')}>
        <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex gap-3">
            <Clock className="h-5 w-5 shrink-0 text-blue-400" />
            <div className="text-sm">
              <div className="font-medium text-blue-400">{t('tour.prepaint.tryThis')}</div>
              <div className="text-muted-foreground">{t('tour.prepaint.tryThisDescription')}</div>
            </div>
          </div>
        </div>

        <BeforeAfter
          before={{
            label: t('tour.prepaint.traditionalCsr'),
            description: t('tour.prepaint.traditionalCsrDescription'),
            demo: <TraditionalDemo />,
            metrics: [{ label: t('common.loadTime'), value: '~2000ms', status: 'bad' }],
          }}
          after={{
            label: t('tour.prepaint.withPrepaint'),
            description: t('tour.prepaint.withPrepaintDescription'),
            demo: <PrepaintDemo />,
            metrics: [{ label: t('common.loadTime'), value: '<20ms', status: 'excellent' }],
          }}
        />
      </div>
    </TourStep>
  );
}
