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
      <div className="rounded-lg border border-border bg-zinc-900/50 p-4">
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
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{t('common.networkErrorUpdateFailed')}</span>
            </div>
            <button
              onClick={retry}
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
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
            ? 'border-yellow-500/30 bg-yellow-500/5'
            : status === 'rollback'
              ? 'border-orange-500/30 bg-orange-500/5'
              : 'border-border bg-zinc-900/50',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('common.inventoryCount')}</span>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-3xl font-bold transition-colors',
                status === 'optimistic'
                  ? 'text-yellow-400'
                  : status === 'rollback'
                    ? 'text-orange-400'
                    : '',
              )}
            >
              {displayCount}
            </span>
            <button
              onClick={handleIncrement}
              disabled={status !== 'idle'}
              className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {status === 'optimistic' && (
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          <span>{t('common.optimisticUpdateApplied')}</span>
        </div>
      )}

      {status === 'rollback' && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center justify-center gap-2 text-orange-400">
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
        <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 shrink-0 text-blue-400" />
            <div className="text-sm">
              <div className="font-medium text-blue-400">{t('tour.tx.tryThis')}</div>
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
