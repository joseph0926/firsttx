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
        <span
          className={cn('font-mono', loadTime ? 'text-status-danger' : 'text-muted-foreground')}
        >
          {loadTime ? `${loadTime.toFixed(0)}ms` : '--'}
        </span>
      </div>

      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-lg border transition-all',
          isLoading
            ? 'border-status-danger/30 bg-tour-surface-strong'
            : 'border-border bg-tour-surface',
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-status-danger border-t-transparent" />
            <span className="text-sm text-muted-foreground">{t('common.blankScreen')}</span>
          </div>
        ) : showContent ? (
          <div className="grid w-full grid-cols-3 gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-tour-surface-strong" />
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
        className="w-full rounded-lg bg-tour-surface-strong px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
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
        <span
          className={cn('font-mono', loadTime ? 'text-status-success' : 'text-muted-foreground')}
        >
          {loadTime ? `${loadTime.toFixed(0)}ms` : '--'}
        </span>
      </div>

      <div
        className={cn(
          'relative flex h-48 items-center justify-center rounded-lg border transition-all',
          isRestoring
            ? 'border-status-success/50 bg-tour-surface'
            : 'border-status-success/20 bg-tour-surface',
        )}
      >
        {isRestoring && (
          <div className="absolute inset-0 flex items-center justify-center bg-status-success/5">
            <div className="flex items-center gap-2 text-status-success">
              <Zap className="h-4 w-4" />
              <span className="text-sm">{t('common.restoringSnapshot')}</span>
            </div>
          </div>
        )}
        <div className="grid w-full grid-cols-3 gap-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-tour-surface-strong" />
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
          className="rounded-lg bg-status-success px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 dark:text-slate-950"
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
        <div className="mb-6 rounded-lg border border-status-info/30 bg-status-info/5 p-4">
          <div className="flex gap-3">
            <Clock className="h-5 w-5 shrink-0 text-status-info" />
            <div className="text-sm">
              <div className="font-medium text-status-info">{t('tour.prepaint.tryThis')}</div>
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
            metrics: [
              { label: t('common.loadTime'), value: 'Snapshot replay', status: 'excellent' },
            ],
          }}
        />
      </div>
    </TourStep>
  );
}
