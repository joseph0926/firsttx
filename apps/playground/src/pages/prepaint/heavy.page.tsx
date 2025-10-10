import { useState, useEffect } from 'react';
import { Zap, Clock, TrendingUp } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

const generateProducts = (count: number): Product[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `product-${i + 1}`,
    name: `Product ${i + 1}`,
    price: Math.floor(Math.random() * 1000) + 50,
    image: `https://picsum.photos/seed/${i}/400/300`,
    description: `High-quality product with advanced features. Perfect for your needs.`,
  }));
};

export default function HeavyPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadTime, setLoadTime] = useState<number>(0);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [isPrepaintActive, setIsPrepaintActive] = useState(false);

  useEffect(() => {
    const startTime = performance.now();

    const hasPrepaint = document.documentElement.hasAttribute('data-prepaint');
    setIsPrepaintActive(hasPrepaint);

    setTimeout(() => {
      setProducts(generateProducts(100));
      const endTime = performance.now();
      setLoadTime(endTime - startTime);

      const visits = Number(localStorage.getItem('heavy-page-visits') || '0');
      setVisitCount(visits + 1);
      localStorage.setItem('heavy-page-visits', String(visits + 1));
    }, 100);
  }, []);

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
        description={`100 products loaded with complex styling. ${isPrepaintActive ? 'Prepaint restored this instantly.' : 'No prepaint snapshot available yet.'}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading products...
        </div>
      )}
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
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-1 font-semibold">{product.name}</h3>
        <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">${product.price}</span>
          <button className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
