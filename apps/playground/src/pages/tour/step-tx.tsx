import { useState, useEffect } from 'react';
import { Shield, RotateCcw, AlertCircle } from 'lucide-react';
import { TourStep } from '@/components/tour';
import { BeforeAfter } from '@/components/demo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

function TraditionalDemo() {
  const { t } = useI18n();
  const [count, setCount] = useState(5);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleIncrement = () => {
    setStatus('loading');

    setTimeout(() => {
      setStatus('error');
    }, 1500);
  };

  const retry = () => {
    setStatus('loading');
    setTimeout(() => {
      setCount((c) => c + 1);
      setStatus('idle');
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-tour-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('common.inventoryCount')}</span>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">{count}</span>
            <button
              onClick={handleIncrement}
              disabled={status === 'loading'}
              className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {status === 'loading' ? t('common.updating') : '+1'}
            </button>
          </div>
        </div>
      </div>

      {status === 'error' && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-status-danger">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{t('common.networkErrorUpdateFailed')}</span>
            </div>
            <button
              onClick={retry}
              className="rounded bg-status-danger px-3 py-1 text-xs font-medium text-white hover:opacity-90 dark:text-slate-950"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground">
        {status === 'idle' && t('common.clickToTriggerNetworkError')}
        {status === 'loading' && t('common.waitingForServerResponse')}
      </div>
    </div>
  );
}

function TxDemo() {
  const { t } = useI18n();
  const [baseCount] = useState(5);
  const [displayCount, setDisplayCount] = useState(5);
  const [status, setStatus] = useState<'idle' | 'optimistic' | 'rollback' | 'success'>('idle');

  const handleIncrement = () => {
    setDisplayCount((c) => c + 1);
    setStatus('optimistic');

    setTimeout(() => {
      setStatus('rollback');
      setTimeout(() => {
        setDisplayCount(baseCount);
        setStatus('idle');
      }, 1000);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'rounded-lg border p-4 transition-all',
          status === 'optimistic'
            ? 'border-status-warning/30 bg-status-warning/5'
            : status === 'rollback'
              ? 'border-status-warning/30 bg-status-warning/5'
              : 'border-border bg-tour-surface',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('common.inventoryCount')}</span>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-3xl font-bold transition-colors',
                status === 'optimistic'
                  ? 'text-status-warning'
                  : status === 'rollback'
                    ? 'text-status-warning'
                    : '',
              )}
            >
              {displayCount}
            </span>
            <button
              onClick={handleIncrement}
              disabled={status !== 'idle'}
              className="rounded bg-status-success px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:text-slate-950"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {status === 'optimistic' && (
        <div className="flex items-center justify-center gap-2 text-sm text-status-warning">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-status-warning border-t-transparent" />
          <span>{t('common.optimisticUpdateApplied')}</span>
        </div>
      )}

      {status === 'rollback' && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 p-4">
          <div className="flex items-center justify-center gap-2 text-status-warning">
            <RotateCcw className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('common.networkFailedRollingBack')}</span>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground">
        {status === 'idle' && t('common.clickToSeeOptimisticUpdate')}
      </div>
    </div>
  );
}

export default function StepTx() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <TourStep
      title={t('tour.tx.title')}
      description={t('tour.tx.description')}
      icon={<Shield className="h-8 w-8" />}
    >
      <div className={cn('transition-opacity duration-500', mounted ? 'opacity-100' : 'opacity-0')}>
        <div className="mb-6 rounded-lg border border-status-info/30 bg-status-info/5 p-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 shrink-0 text-status-info" />
            <div className="text-sm">
              <div className="font-medium text-status-info">{t('tour.tx.tryThis')}</div>
              <div className="text-muted-foreground">{t('tour.tx.tryThisDescription')}</div>
            </div>
          </div>
        </div>

        <BeforeAfter
          before={{
            label: t('tour.tx.traditionalUpdates'),
            description: t('tour.tx.traditionalUpdatesDescription'),
            demo: <TraditionalDemo />,
            metrics: [
              { label: t('tour.tx.errorHandling'), value: t('tour.tx.manual'), status: 'bad' },
              { label: t('tour.tx.userAction'), value: t('tour.tx.required'), status: 'bad' },
            ],
          }}
          after={{
            label: t('tour.tx.withTx'),
            description: t('tour.tx.withTxDescription'),
            demo: <TxDemo />,
            metrics: [
              {
                label: t('tour.tx.errorHandling'),
                value: t('tour.localFirst.automatic'),
                status: 'excellent',
              },
              {
                label: t('tour.tx.userAction'),
                value: t('tour.localFirst.none'),
                status: 'excellent',
              },
            ],
          }}
        />
      </div>
    </TourStep>
  );
}
