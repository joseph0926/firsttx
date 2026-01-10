import { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { TourStep } from '@/components/tour';
import { BeforeAfter } from '@/components/demo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

const INITIAL_ITEMS: CartItem[] = [
  { id: '1', name: 'React Handbook', quantity: 1 },
  { id: '2', name: 'TypeScript Guide', quantity: 2 },
];

function TraditionalDemo() {
  const { t } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadCart = () => {
    setIsLoading(true);
    setTimeout(() => {
      setItems(INITIAL_ITEMS);
      setIsLoading(false);
      setHasLoaded(true);
    }, 1500);
  };

  const simulateClose = () => {
    setItems([]);
    setHasLoaded(false);
  };

  const incrementItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  };

  return (
    <div className="space-y-4">
      {!hasLoaded ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-border bg-zinc-900/50">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">{t('common.loadingCart')}</span>
            </div>
          ) : (
            <button
              onClick={loadCart}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {t('common.loadCart')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-zinc-900/50 p-3"
            >
              <span className="text-sm">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">x{item.quantity}</span>
                <button
                  onClick={() => incrementItem(item.id)}
                  className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                >
                  +1
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasLoaded && (
        <button
          onClick={simulateClose}
          className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-700"
        >
          {t('common.closeTabSimulate')}
        </button>
      )}

      {!hasLoaded && items.length === 0 && (
        <div className="text-center text-xs text-red-400">{t('common.cartDataWasLost')}</div>
      )}
    </div>
  );
}

function LocalFirstDemo() {
  const { t } = useI18n();
  const [items, setItems] = useState<CartItem[]>(INITIAL_ITEMS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [wasRestored, setWasRestored] = useState(false);

  const incrementItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    );
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 500);
  };

  const simulateClose = () => {
    setWasRestored(true);
    setTimeout(() => setWasRestored(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center justify-between rounded-lg border p-3 transition-colors',
              wasRestored ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-zinc-900/50',
            )}
          >
            <span className="text-sm">{item.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">x{item.quantity}</span>
              <button
                onClick={() => incrementItem(item.id)}
                className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
              >
                +1
              </button>
            </div>
          </div>
        ))}
      </div>

      {isSyncing && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>{t('common.syncingToServer')}</span>
        </div>
      )}

      {wasRestored && (
        <div className="text-center text-xs text-green-400">
          {t('common.dataRestoredFromIndexedDB')}
        </div>
      )}

      <button
        onClick={simulateClose}
        className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-700"
      >
        {t('common.closeTabSimulate')}
      </button>
    </div>
  );
}

export default function StepLocalFirst() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <TourStep
      title={t('tour.localFirst.title')}
      description={t('tour.localFirst.description')}
      icon={<Database className="h-8 w-8" />}
    >
      <div className={cn('transition-opacity duration-500', mounted ? 'opacity-100' : 'opacity-0')}>
        <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex gap-3">
            <Database className="h-5 w-5 shrink-0 text-blue-400" />
            <div className="text-sm">
              <div className="font-medium text-blue-400">{t('tour.localFirst.tryThis')}</div>
              <div className="text-muted-foreground">{t('tour.localFirst.tryThisDescription')}</div>
            </div>
          </div>
        </div>

        <BeforeAfter
          before={{
            label: t('tour.localFirst.traditionalState'),
            description: t('tour.localFirst.traditionalStateDescription'),
            demo: <TraditionalDemo />,
            metrics: [
              {
                label: t('tour.localFirst.dataPersistence'),
                value: t('tour.localFirst.none'),
                status: 'bad',
              },
            ],
          }}
          after={{
            label: t('tour.localFirst.withLocalFirst'),
            description: t('tour.localFirst.withLocalFirstDescription'),
            demo: <LocalFirstDemo />,
            metrics: [
              {
                label: t('tour.localFirst.dataPersistence'),
                value: t('tour.localFirst.automatic'),
                status: 'excellent',
              },
            ],
          }}
        />
      </div>
    </TourStep>
  );
}
