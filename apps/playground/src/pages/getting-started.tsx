import { useState } from 'react';
import { BookOpen, ChevronRight, Code2, Database, RefreshCw, Shield, Zap } from 'lucide-react';
import { ScenarioLayout, SectionHeader } from '../components/scenario-layout';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  code: string;
  highlight: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Define a Model',
    description:
      'Create a type-safe model with Zod schema. Models persist data in IndexedDB with automatic TTL management.',
    icon: <Database className="h-5 w-5" />,
    code: `import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const CartSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number()
  })),
  total: z.number()
});

export const CartModel = defineModel('cart', {
  schema: CartSchema,
  ttl: 5 * 60 * 1000,
  initialData: { items: [], total: 0 }
});`,
    highlight: 'defineModel with Zod validation ensures data integrity',
  },
  {
    id: 2,
    title: 'Use with React Hooks',
    description:
      'useSyncedModel provides reactive data with automatic server synchronization. Set syncOnMount to control when data refreshes.',
    icon: <RefreshCw className="h-5 w-5" />,
    code: `import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const {
    data: cart,
    patch,
    sync,
    isSyncing,
    history
  } = useSyncedModel(
    CartModel,
    async () => {
      const res = await fetch('/api/cart');
      return res.json();
    },
    { syncOnMount: 'stale' }
  );

  if (!cart) return <Skeleton />;

  return (
    <div>
      {history.isStale && <Badge>Stale</Badge>}
      <CartItems items={cart.items} />
    </div>
  );
}`,
    highlight: 'syncOnMount: "stale" auto-refreshes only when TTL expires',
  },
  {
    id: 3,
    title: 'Optimistic Updates with Transactions',
    description:
      'useTx provides optimistic updates with automatic rollback on failure. UI responds instantly while server sync happens in background.',
    icon: <Shield className="h-5 w-5" />,
    code: `import { useTx } from '@firsttx/tx';
import { CartModel } from './models/cart';

function AddToCartButton({ item }) {
  const { mutate, isPending } = useTx({
    optimistic: async (item) => {
      await CartModel.patch(draft => {
        draft.items.push(item);
        draft.total += item.price;
      });
    },
    rollback: async (item) => {
      await CartModel.patch(draft => {
        draft.items = draft.items.filter(i => i.id !== item.id);
        draft.total -= item.price;
      });
    },
    request: async (item) => {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify(item)
      });
      return res.json();
    },
    retry: { maxAttempts: 3, backoff: 'exponential' }
  });

  return (
    <button onClick={() => mutate(item)} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}`,
    highlight: 'Automatic rollback ensures data consistency on failure',
  },
  {
    id: 4,
    title: 'Enable Instant Page Restoration',
    description:
      'Prepaint captures DOM snapshots on page leave and restores them instantly on revisit. Zero configuration needed.',
    icon: <Zap className="h-5 w-5" />,
    code: `import { createFirstTxRoot } from '@firsttx/prepaint';
import { StrictMode } from 'react';
import App from './App';

createFirstTxRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App />
  </StrictMode>,
  {
    transition: true,
    onCapture: (snapshot) => {
      console.log('Captured:', snapshot.route);
    },
    onHandoff: (strategy) => {
      console.log('Strategy:', strategy);
    }
  }
);`,
    highlight: 'Replace ReactDOM.createRoot with createFirstTxRoot',
  },
];

export default function GettingStarted() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <ScenarioLayout
      level={1}
      title="Getting Started"
      badge={{
        icon: <BookOpen className="h-3 w-3" />,
        label: 'Tutorial',
      }}
    >
      <SectionHeader
        title="Quick Start Guide"
        description="Learn the fundamentals of FirstTx in 4 simple steps. Each step builds on the previous one to create a complete local-first experience."
      />
      <div className="mb-8 flex gap-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(index)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeStep === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-xs">
              {step.id}
            </span>
            <span className="hidden sm:inline">{step.title.split(' ').slice(0, 2).join(' ')}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                activeStep === index
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
              onClick={() => setActiveStep(index)}
            >
              <div className="mb-2 flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    activeStep === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.icon}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                {activeStep === index && <ChevronRight className="ml-auto h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                <Code2 className="h-3 w-3" />
                <span>{step.highlight}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="sticky top-6 h-fit">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-sm font-medium">
                Step {steps[activeStep].id}: {steps[activeStep].title}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(steps[activeStep].code);
                }}
                className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
              <code className="text-muted-foreground">{steps[activeStep].code}</code>
            </pre>
          </div>
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <h4 className="mb-2 text-sm font-semibold">Key Point</h4>
            <p className="text-sm text-muted-foreground">{steps[activeStep].highlight}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="flex-1 rounded bg-card px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={activeStep === steps.length - 1}
              className="flex-1 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">What's Next?</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded bg-muted/50 p-4">
            <h4 className="mb-1 font-medium">Explore Scenarios</h4>
            <p className="text-sm text-muted-foreground">
              Try the 9 interactive scenarios to see FirstTx in action.
            </p>
          </div>
          <div className="rounded bg-muted/50 p-4">
            <h4 className="mb-1 font-medium">Read the Docs</h4>
            <p className="text-sm text-muted-foreground">
              Check out the package documentation on GitHub.
            </p>
          </div>
          <div className="rounded bg-muted/50 p-4">
            <h4 className="mb-1 font-medium">Install FirstTx</h4>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-background px-1 text-xs">
                pnpm add @firsttx/local-first @firsttx/tx @firsttx/prepaint
              </code>
            </p>
          </div>
        </div>
      </div>
    </ScenarioLayout>
  );
}
