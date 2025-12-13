import { useState, useEffect } from 'react';
import { Zap, Clock, TrendingUp } from 'lucide-react';
import { DemoLayout, MetricsGrid, MetricCard, SectionHeader } from '@/components/demo';
import { useSyncedModel } from '@firsttx/local-first';
import { ProductsModel, type Product } from '@/models/products.model';
import { fetchProducts } from '@/api/mock-products';
import { useHandoffStrategy } from '@/lib/prepaint-handshake';
import { getDemoById, getRelatedDemos } from '@/data/learning-paths';

const demoMeta = getDemoById('heavy')!;
const relatedDemos = getRelatedDemos('heavy', 2);

export default function HeavyPage() {
  const {
    data: products,
    sync,
    isSyncing,
    error,
  } = useSyncedModel(
    ProductsModel,
    async () => {
      const items = await fetchProducts();
      return {
        items,
        lastFetch: Date.now(),
      };
    },
    {
      syncOnMount: 'stale',
    },
  );

  const [loadTime, setLoadTime] = useState<number>(0);
  const [visitCount, setVisitCount] = useState<number>(0);
  const handoffStrategy = useHandoffStrategy();
  const isPrepaintActive = handoffStrategy === 'has-prepaint';

  useEffect(() => {
    const startTime = performance.now();
    const visits = Number(localStorage.getItem('heavy-page-visits') || '0');
    setVisitCount(visits + 1);
    localStorage.setItem('heavy-page-visits', String(visits + 1));
    const endTime = performance.now();
    setLoadTime(endTime - startTime);
  }, []);

  if (!products) {
    return (
      <DemoLayout
        level={demoMeta.level}
        title={demoMeta.title}
        packages={demoMeta.packages}
        difficulty={demoMeta.difficulty}
        duration={demoMeta.duration}
        problem={demoMeta.problem}
        solution={demoMeta.solution}
        problemDetails={demoMeta.problemDetails}
        solutionDetails={demoMeta.solutionDetails}
        codeSnippet={demoMeta.codeSnippet}
        codeTitle={demoMeta.codeTitle}
        docsLink={demoMeta.docsLink}
        relatedDemos={relatedDemos}
      >
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          {isSyncing ? (
            <div className="text-center">
              <div className="mb-2 text-lg">Loading initial data...</div>
              <div className="text-sm">Fetching from server</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-2 text-lg">No data</div>
              <button
                onClick={() => sync()}
                className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </DemoLayout>
    );
  }

  if (error) {
    return (
      <DemoLayout
        level={demoMeta.level}
        title={demoMeta.title}
        packages={demoMeta.packages}
        difficulty={demoMeta.difficulty}
        duration={demoMeta.duration}
        problem={demoMeta.problem}
        solution={demoMeta.solution}
        problemDetails={demoMeta.problemDetails}
        solutionDetails={demoMeta.solutionDetails}
        codeSnippet={demoMeta.codeSnippet}
        codeTitle={demoMeta.codeTitle}
        docsLink={demoMeta.docsLink}
        relatedDemos={relatedDemos}
      >
        <div className="rounded border border-destructive bg-destructive/10 p-4">
          <h3 className="mb-2 font-semibold text-destructive">Sync Error</h3>
          <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => sync()}
            disabled={isSyncing}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {isSyncing ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </DemoLayout>
    );
  }

  const avgLoadTime = visitCount > 1 ? (loadTime + (visitCount - 1) * 120) / visitCount : loadTime;

  return (
    <DemoLayout
      level={demoMeta.level}
      title={demoMeta.title}
      packages={demoMeta.packages}
      difficulty={demoMeta.difficulty}
      duration={demoMeta.duration}
      problem={demoMeta.problem}
      solution={demoMeta.solution}
      problemDetails={demoMeta.problemDetails}
      solutionDetails={demoMeta.solutionDetails}
      codeSnippet={demoMeta.codeSnippet}
      codeTitle={demoMeta.codeTitle}
      docsLink={demoMeta.docsLink}
      relatedDemos={relatedDemos}
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
        } ${isSyncing ? 'Syncing with server...' : ''}`}
      />

      <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Zap className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm">
            <div className="font-medium text-blue-400">Try This</div>
            <div className="text-muted-foreground">
              Press F5 to refresh and compare loading times on revisit. When Prepaint is active, the
              screen displays instantly.
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        data-testid="product-grid"
      >
        {products.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </DemoLayout>
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
