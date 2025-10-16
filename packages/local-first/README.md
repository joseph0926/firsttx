# @firsttx/local-first

**Bridge IndexedDB (async) and React state (sync) seamlessly.**

Type-safe IndexedDB models with React integration via `useSyncExternalStore`. Eliminates 90% of server sync boilerplate. Works with `@firsttx/tx` for atomic optimistic updates.

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400559/firsttx-local-01_zwhtge.gif" />

```bash
npm install @firsttx/local-first zod
```

[![npm version](https://img.shields.io/npm/v/@firsttx/local-first.svg)](https://www.npmjs.com/package/@firsttx/local-first)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Basic Usage

### 1. Define a Model

```ts
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

export const CartModel = defineModel('cart', {
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        qty: z.number(),
      }),
    ),
    total: z.number(),
  }),
  ttl: 5 * 60 * 1000, // 5 minutes
  initialData: { items: [], total: 0 },
});
```

### 2. Use in React (Local-Only)

```tsx
import { useModel } from '@firsttx/local-first';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <Skeleton />;

  return (
    <div>
      {history.isStale && <Badge>Stale ({Math.floor(history.age / 1000)}s old)</Badge>}
      <h1>Cart ({cart.items.length} items)</h1>
      <button
        onClick={() =>
          patch((draft) => {
            draft.items.push({ id: '1', name: 'Product', price: 100, qty: 1 });
            draft.total += 100;
          })
        }
      >
        Add Item
      </button>
    </div>
  );
}
```

### 3. Server Sync with `useSyncedModel`

**Before (Traditional):**

```tsx
const [cart, setCart] = useState(null);
const [isSyncing, setIsSyncing] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setIsSyncing(true);
  fetch('/api/cart')
    .then((r) => r.json())
    .then(setCart)
    .catch(setError)
    .finally(() => setIsSyncing(false));
}, []);
```

**After (`useSyncedModel`):**

```tsx
import { useSyncedModel } from '@firsttx/local-first';

const {
  data: cart,
  isSyncing,
  error,
} = useSyncedModel(CartModel, () => fetch('/api/cart').then((r) => r.json()));
```

**Full Example:**

```tsx
function CartPage() {
  const {
    data: cart,
    patch,
    sync,
    isSyncing,
    error,
    history,
  } = useSyncedModel(
    CartModel,
    async (current) => {
      // Receives current local data (useful for delta sync)
      const response = await fetch('/api/cart');
      return response.json();
    },
    {
      syncOnMount: 'stale', // Default: sync when data is stale
      onSuccess: (data) => console.log('Synced:', data),
      onError: (err) => toast.error(err.message),
    },
  );

  if (!cart) return <Skeleton />;
  if (error) return <ErrorBanner error={error} onRetry={sync} />;

  return (
    <div>
      {isSyncing && <SyncIndicator />}
      {history.isStale && <Badge>Updating...</Badge>}
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

---

## syncOnMount Strategies

```tsx
// Default: Sync when data exceeds TTL
useSyncedModel(Model, fetcher);
// Same as: { syncOnMount: 'stale' }

// Always sync on mount (critical data)
useSyncedModel(Model, fetcher, { syncOnMount: 'always' });

// Never auto-sync (manual control)
useSyncedModel(Model, fetcher, { syncOnMount: 'never' });
```

| Strategy            | When to Sync         | Use Case                                     |
| ------------------- | -------------------- | -------------------------------------------- |
| `'stale'` (default) | Data age > TTL       | Most cases - balance freshness & performance |
| `'always'`          | Every mount          | Critical data (balance, stock price)         |
| `'never'`           | Manual `sync()` only | Draft content, offline-first                 |

---

## API

### `defineModel(name, options)`

```typescript
const Model = defineModel('key', {
  schema: ZodSchema,
  ttl?: number,              // Time-to-live (ms)
  version?: number,          // Schema version
  initialData?: T,           // Default data
  merge?: (current, incoming) => T
});
```

### `useModel(model)`

```typescript
const [data, patch, history, error] = useModel(Model);

// data: T | null
// patch: (mutator: (draft: T) => void) => Promise<void>
// history: { updatedAt, age, isStale }
// error: Error | null
```

### `useSyncedModel(model, fetcher, options?)`

```typescript
const {
  data,      // T | null
  patch,     // (mutator) => Promise<void>
  sync,      // () => Promise<void> - Manual sync
  isSyncing, // boolean
  error,     // Error | null
  history    // { updatedAt, age, isStale }
} = useSyncedModel(Model, fetcher, {
  syncOnMount?: 'always' | 'stale' | 'never',
  onSuccess?: (data: T) => void,
  onError?: (error: Error) => void
});

// fetcher: (current: T | null) => Promise<T>
```

---

## Real-World Examples

### Shopping Cart

```tsx
async function fetchCart(current) {
  const response = await fetch('/api/cart');
  return response.json();
}

function CartPage() {
  const { data: cart, patch, isSyncing } = useSyncedModel(CartModel, fetchCart);

  const addItem = (product: Product) => {
    patch((draft) => {
      const existing = draft.items.find((i) => i.id === product.id);
      if (existing) {
        existing.qty += 1;
      } else {
        draft.items.push({ ...product, qty: 1 });
      }
      draft.total += product.price;
    });
  };

  const updateQty = (itemId: string, newQty: number) => {
    patch((draft) => {
      const item = draft.items.find((i) => i.id === itemId);
      if (item) {
        const diff = newQty - item.qty;
        item.qty = newQty;
        draft.total += item.price * diff;
      }
    });
  };

  const removeItem = (itemId: string) => {
    patch((draft) => {
      const index = draft.items.findIndex((i) => i.id === itemId);
      if (index >= 0) {
        const item = draft.items[index];
        draft.total -= item.price * item.qty;
        draft.items.splice(index, 1);
      }
    });
  };

  if (!cart) return <Skeleton />;

  return (
    <div>
      {isSyncing && <SyncIndicator />}
      <CartItems items={cart.items} onUpdate={updateQty} onRemove={removeItem} />
      <AddProductButton onAdd={addItem} />
      <Total amount={cart.total} />
    </div>
  );
}
```

### Delta Sync

```tsx
const { data } = useSyncedModel(CartModel, async (current) => {
  if (!current) {
    // First visit: full sync
    return fetch('/api/cart').then((r) => r.json());
  }

  // Subsequent: delta sync
  const response = await fetch(`/api/cart/delta?since=${current.updatedAt}`);
  const delta = await response.json();

  return {
    ...current,
    items: [...current.items, ...delta.newItems],
    updatedAt: Date.now(),
  };
});
```

### With Tx (Optimistic Updates)

```tsx
import { startTransaction } from '@firsttx/tx';

async function addToCart(product: Product) {
  const tx = startTransaction({ transition: true });
  const newItem = { ...product, qty: 1 };

  await tx.run(
    async () => {
      // Optimistic update
      await CartModel.patch((draft) => {
        draft.items.push(newItem);
        draft.total += product.price;
      });

      // Server request
      await fetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify(newItem),
      });
    },
    {
      // Auto-rollback on failure
      compensate: async () => {
        await CartModel.patch((draft) => {
          draft.items = draft.items.filter((i) => i.id !== newItem.id);
          draft.total -= product.price;
        });
      },
    },
  );

  await tx.commit();
}
```

---

## Advanced Patterns

### Conditional Sync

```tsx
const { data, sync, history } = useSyncedModel(Model, fetcher, {
  syncOnMount: 'never',
});

// Sync when user explicitly refreshes
<button onClick={sync} disabled={!history.isStale}>
  {history.isStale ? 'Refresh' : 'Up to date'}
</button>;
```

### Error Recovery

```tsx
const { data, sync, error } = useSyncedModel(Model, fetcher, {
  onError: (err) => {
    if (err.message.includes('401')) {
      redirectToLogin();
    } else {
      toast.error('Sync failed. Using cached data.');
    }
  },
});

if (error && !data) {
  return <ErrorState onRetry={sync} />;
}
```

### Multiple Models

```tsx
function Dashboard() {
  const { data: user } = useSyncedModel(UserModel, fetchUser);
  const { data: cart } = useSyncedModel(CartModel, fetchCart);
  const { data: products } = useSyncedModel(ProductsModel, fetchProducts, {
    syncOnMount: 'always', // Critical data
  });

  if (!user || !cart || !products) return <Skeleton />;

  return <DashboardView user={user} cart={cart} products={products} />;
}
```

---

## Best Practices

### DO

✅ **Use `useSyncedModel` for server-backed data**

```tsx
// Eliminates boilerplate
const { data } = useSyncedModel(Model, fetcher);
```

✅ **Render skeletons when `data === null`**

```tsx
if (!data) return <Skeleton />;
```

✅ **Show sync indicators**

```tsx
{
  isSyncing && <Spinner />;
}
{
  history.isStale && <Badge>Updating...</Badge>;
}
```

✅ **Use default `syncOnMount` for most cases**

```tsx
// Syncs when revisiting stale data
useSyncedModel(Model, fetcher);
```

✅ **Handle errors gracefully**

```tsx
{
  error && <ErrorBanner error={error} onRetry={sync} />;
}
```

### DON'T

❌ **Don't store sensitive data without encryption**

```tsx
// BAD: Passwords, SSN, credit cards in plain text
defineModel('secrets', { schema: z.object({ password: z.string() }) });
```

❌ **Don't mutate state directly**

```tsx
// BAD
cart.items.push(newItem);

// GOOD
patch((draft) => {
  draft.items.push(newItem);
});
```

❌ **Don't assume instant availability**

```tsx
// BAD
const [cart] = useModel(CartModel);
console.log(cart.items); // May be null!

// GOOD
if (!cart) return <Skeleton />;
console.log(cart.items);
```

---

## Security Notice

⚠️ **FirstTx does NOT encrypt data at rest.**

- IndexedDB is protected by same-origin policy
- Data is accessible via browser DevTools
- **Do NOT store sensitive information** without additional encryption

For sensitive data:

- Use session memory (non-persistent)
- Use encryption libraries (e.g., `crypto-js`)
- Keep sensitive data server-only

---

## Troubleshooting

**Q: Why is `data` always `null`?**

A: In-memory cache is warming up. This happens on:

- First render
- After clearing IndexedDB
- After version mismatch

Always render a skeleton/loading state.

---

**Q: Why isn't my `patch()` reflecting in UI?**

A: Ensure you're:

1. Using `patch` from the hook (not direct model method)
2. Mutating the draft object (not returning new object)
3. Not blocking React re-render

```tsx
// ❌ BAD
patch(() => ({ items: [...items, newItem] }));

// ✅ GOOD
patch((draft) => {
  draft.items.push(newItem);
});
```

---

**Q: How do I force a sync?**

A: Call `sync()` manually:

```tsx
const { sync } = useSyncedModel(Model, fetcher);

<button onClick={sync}>Force Sync</button>;
```

---

**Q: Can I use multiple models?**

A: Yes! Each model is independent:

```tsx
const { data: cart } = useSyncedModel(CartModel, fetchCart);
const { data: user } = useSyncedModel(UserModel, fetchUser);
```

---

**Q: What happens on first visit (empty IndexedDB)?**

A: With default `syncOnMount: 'stale'`:

1. `data` starts as `null`
2. `fetcher(null)` is called automatically
3. Data is stored to IndexedDB
4. Component re-renders with synced data

**Q: Do changes sync across tabs?**

A: Yes! Cross-tab synchronization is automatic via BroadcastChannel API.

```tsx
// Tab A
await patch((draft) => {
  draft.count++;
});

// Tab B - automatically updated (~1ms)
```

Works in Chrome 54+, Firefox 38+, Safari 15.4+ (97%+ coverage).

---

## Changelog

### [0.3.1](https://github.com/joseph0926/firsttx/releases/tag/%40firsttx%2Flocal-first%400.3.1) - 2025.10.12

**delay auto-sync until model hydration to prevent premature stale checks**

Previously, useSyncedModel triggered sync-on-mount before IndexedDB hydration,
causing stale mode ('syncOnMount: "stale"') to always refetch on every reload.
This change defers the auto-sync decision until after the model's history has
been loaded, ensuring sync only runs when data is actually stale.

### [0.3.0](https://github.com/joseph0926/firsttx/releases/tag/%40firsttx%2Flocal-first%400.3.0) - 2025.10.12

**replace autoSync with syncOnMount for clarity**

> BREAKING CHANGE: Remove autoSync option in favor of syncOnMount

Replace boolean autoSync with explicit syncOnMount: 'always' | 'stale' | 'never'
Change default behavior: sync on mount when data is stale (was: no auto-sync)
Align with React Query's refetch trigger pattern
Improve synergy with Prepaint's instant replay on revisit

**Migration**

autoSync: true → syncOnMount: 'stale' (or omit, it's default)
autoSync: false → syncOnMount: 'never'

**Fixes**

Remove ambiguity of "when does auto-sync trigger?"
Fix test assumptions about mount-time sync behavior
Prevent race conditions in unmount tests with syncInProgressRef

---

## Related Packages

- [`@firsttx/tx`](https://www.npmjs.com/package/@firsttx/tx) - Atomic transactions for optimistic updates
- [`@firsttx/prepaint`](https://www.npmjs.com/package/@firsttx/prepaint) - Instant restoration on revisit

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
