import { useState, useEffect } from 'react';
import { Zap, Clock, TrendingUp } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';
import { useModel } from '@firsttx/local-first';
import { ProductsModel, type Product } from '@/models/products.model';
import { fetchProducts } from '@/api/mock-products';

export default function HeavyPage() {
  const [products, , history] = useModel(ProductsModel);
  const [loadTime, setLoadTime] = useState<number>(0);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [isPrepaintActive, setIsPrepaintActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    const hasPrepaint = document.documentElement.hasAttribute('data-prepaint');
    setIsPrepaintActive(hasPrepaint);

    const visits = Number(localStorage.getItem('heavy-page-visits') || '0');
    setVisitCount(visits + 1);
    localStorage.setItem('heavy-page-visits', String(visits + 1));

    const endTime = performance.now();
    setLoadTime(endTime - startTime);
  }, []);

  useEffect(() => {
    const shouldFetch = !products || history.isStale;

    if (shouldFetch) {
      setIsSyncing(true);
      fetchProducts()
        .then((items) =>
          ProductsModel.replace({
            items,
            lastFetch: Date.now(),
          }),
        )
        .finally(() => setIsSyncing(false));
    }
  }, [products, history.isStale]);

  if (!products) {
    return (
      <ScenarioLayout level={1} title="Heavy Page">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading initial data...
        </div>
      </ScenarioLayout>
    );
  }

  const avgLoadTime = visitCount > 1 ? (loadTime + (visitCount - 1) * 120) / visitCount : loadTime;

  return (
    <ScenarioLayout
      level={1}
      title="Heavy Page"
      badge={
        isPrepaintActive
          ? {
              icon: <Zap className="h-3 w-3" />,
              label: 'Prepaint Active',
            }
          : undefined
      }
    >
      <MetricsGrid>
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Blank Screen Time"
          value={`${loadTime.toFixed(1)}ms`}
          target="<20ms"
          status={loadTime < 20 ? 'excellent' : loadTime < 50 ? 'good' : 'poor'}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Visit Count"
          value={visitCount.toString()}
          target={visitCount > 1 ? 'Warm visit' : 'Cold start'}
          status="good"
        />
        <MetricCard
          icon={<Zap className="h-5 w-5" />}
          label="Average Load"
          value={`${avgLoadTime.toFixed(1)}ms`}
          target="Improving"
          status={avgLoadTime < 50 ? 'excellent' : 'good'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Product Showcase"
        description={`${products.items.length} products loaded with complex styling. ${
          isPrepaintActive
            ? 'Prepaint restored this instantly.'
            : 'No prepaint snapshot available yet.'
        } ${isSyncing ? '🔄 Syncing with server...' : ''}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </ScenarioLayout>
  );
}

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
      <div className="aspect-video overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-1 font-semibold">{product.name}</h3>
        <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
          <button className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
