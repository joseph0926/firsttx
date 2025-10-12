# @firsttx/local-first

**Bridge IndexedDB (async) and React state (sync) seamlessly.**

Local-First provides type-safe IndexedDB models that integrate with React using `useSyncExternalStore` and an in-memory cache pattern. Works hand-in-hand with `@firsttx/tx` for atomic optimistic updates and automatic rollbacks.

[![npm version](https://img.shields.io/npm/v/@firsttx/local-first.svg)](https://www.npmjs.com/package/@firsttx/local-first)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Features

- **React 18+ Integration:** Uses `useSyncExternalStore` for optimal rendering
- **Server Sync Made Easy:** `useSyncedModel` hook eliminates 90% of sync boilerplate
- **Type Safety:** Zod schema validation for all data operations
- **Staleness Tracking:** Built-in TTL and data age indicators
- **Version Management:** Auto-reset when schema versions change
- **Optimistic Updates:** Fast local mutations with `patch()`
- **Multi-tab Sync:** BroadcastChannel support (Phase 1)

---

## Installation

```bash
pnpm add @firsttx/local-first zod

# peer dependencies
pnpm add react zod
```

**Requirements:**

- React 18.2.0+ or 19.2.0+
- Node.js 18+
- Modern browser with IndexedDB support

---

## Quick Start

### 1. Define a Model

```ts
// models/cart.ts
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
    updatedAt: z.number(),
  }),
  ttl: 5 * 60 * 1000, // 5 minutes
  version: 1,
  initialData: { items: [], updatedAt: 0 },
});
```

### 2. Use in React Components (Basic)

```tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <Skeleton />;

  return (
    <div>
      {history.isStale && <Badge>Data is {Math.floor(history.age / 60000)} min old</Badge>}
      <h1>Cart ({cart.items.length} items)</h1>
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

### 3. Server Sync with `useSyncedModel`

Eliminate server sync boilerplate with automatic state management:

```tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

async function fetchCart(current) {
  const response = await fetch('/api/cart');
  return response.json();
}

function CartPage() {
  const {
    data: cart,
    patch,
    sync,
    isSyncing,
    error,
    history,
  } = useSyncedModel(CartModel, fetchCart, {
    syncOnMount: 'stale', // Sync on mount when data is stale (default)
    onSuccess: (data) => console.log('Synced:', data),
    onError: (err) => toast.error(err.message),
  });

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

**Before vs After:**

```tsx
// Traditional approach (verbose)
const [data, setData] = useState(null);
const [isSyncing, setIsSyncing] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setIsSyncing(true);
  fetch('/api/data')
    .then((res) => res.json())
    .then(setData)
    .catch(setError)
    .finally(() => setIsSyncing(false));
}, []);

// useSyncedModel (concise)
const { data, isSyncing, error, sync } = useSyncedModel(DataModel, fetchData);
```

### 4. Update Data with `patch()`

```tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function AddToCartButton({ product }) {
  const [cart, patch] = useModel(CartModel);

  const handleClick = async () => {
    await patch((draft) => {
      const existing = draft.items.find((item) => item.id === product.id);
      if (existing) {
        existing.qty += 1;
      } else {
        draft.items.push({ ...product, qty: 1 });
      }
      draft.updatedAt = Date.now();
    });
  };

  return <button onClick={handleClick}>Add to Cart</button>;
}
```

---

## API Reference

### `defineModel(name, options)`

Creates a new model with IndexedDB persistence.

**Parameters:**

- `name` (string): Unique identifier for the model
- `options`:
  - `schema` (ZodSchema): Zod schema for validation
  - `ttl` (number): Time-to-live in milliseconds
  - `version?` (number): Schema version (triggers data reset on change)
  - `initialData?` (T): Default data when none exists
  - `merge?` (function): Custom merge strategy `(current, incoming) => T`

**Returns:** `Model<T>`

---

### `useModel(model)`

Basic React hook for subscribing to model changes.

**Returns:** `[state, patch, history, error]`

- `state` (T | null): Current model state
- `patch` (function): `(mutator: (draft: T) => void) => Promise<void>`
- `history` (ModelHistory): Metadata about the data
- `error` (Error | null): Validation or storage errors

---

### `useSyncedModel(model, fetcher, options?)`

**NEW in v0.2.0** - React hook with built-in server synchronization.

**Parameters:**

- `model` (Model<T>): The model to sync
- `fetcher` (Fetcher<T>): Async function that fetches server data
  - Type: `(current: T | null) => Promise<T>`
  - Receives current local data (useful for delta sync)
- `options?` (SyncOptions<T>):
  - `syncOnMount?` ('always' | 'stale' | 'never'): When to sync on mount (default: `'stale'`)
    - `'stale'`: Sync only when data exceeds TTL
    - `'always'`: Always sync on mount, regardless of freshness
    - `'never'`: Never auto-sync, manual `sync()` only
  - `onSuccess?` (callback): Called after successful sync
  - `onError?` (callback): Called on sync failure

**Returns:** `SyncedModelResult<T>`

```ts
{
  data: T | null;           // Current model state
  patch: (mutator) => void; // Update local data
  sync: () => Promise<void>; // Manually trigger sync
  isSyncing: boolean;       // Sync in progress?
  error: Error | null;      // Sync error if any
  history: ModelHistory;    // Data metadata
}
```

**Key Features:**

- **Automatic state management:** No manual `useState` for `isSyncing`, `error`
- **ViewTransition integration:** Smooth updates by default
- **AutoSync support:** Automatically sync when data becomes stale
- **Current data passing:** Fetcher receives current local data for delta sync

**Example - Manual sync:**

```tsx
const { data, sync, isSyncing, error } = useSyncedModel(CartModel, fetchCart);

return (
  <div>
    <button onClick={sync} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Refresh'}
    </button>
    {error && <ErrorMessage error={error} />}
  </div>
);
```

**Example - Auto-sync:**

```tsx
const { data, history } = useSyncedModel(CartModel, fetchCart);
// Syncs on mount when stale (default behavior)

return (
  <div>
    {history.isStale && <Badge>Updating...</Badge>}
    {/* Your UI */}
  </div>
);
```

---

### Model Methods (Direct Access)

For use outside of React components:

```ts
await model.getSnapshot();              // Get current data
await model.replace(data);              // Replace entire data
await model.patch((draft) => {...});    // Mutate data
await model.getHistory();               // Get metadata
model.getCachedSnapshot();              // Sync access to cache
model.subscribe(callback);              // Subscribe to changes
```

---

## Design Patterns

### Pattern 1: Auto-Sync with Staleness Detection

```tsx
const { data, history } = useSyncedModel(ProductsModel, fetchProducts);
// Uses default syncOnMount: 'stale'

return (
  <div>
    {history.isStale && <SyncIndicator />}
    {data?.items.map((p) => (
      <ProductCard key={p.id} {...p} />
    ))}
  </div>
);
```

### Pattern 2: Optimistic Updates with Tx

Combine with `@firsttx/tx` for atomic operations:

```tsx
import { startTransaction } from '@firsttx/tx';

async function addToCart(product) {
  const tx = startTransaction({ transition: true });

  await tx.run(
    () =>
      CartModel.patch((draft) => {
        draft.items.push({ ...product, qty: 1 });
      }),
    {
      compensate: () =>
        CartModel.patch((draft) => {
          draft.items.pop();
        }),
    },
  );

  await tx.run(() => api.post('/cart/add', { id: product.id }));
  await tx.commit();
}
```

### Pattern 3: Manual Sync with Error Handling

```tsx
const { data, sync, isSyncing, error } = useSyncedModel(CartModel, fetchCart, {
  onSuccess: () => toast.success('Cart synced'),
  onError: (err) => toast.error(err.message),
});

return (
  <div>
    <button onClick={sync} disabled={isSyncing}>
      Refresh Cart
    </button>
    {error && <ErrorBanner error={error} onRetry={sync} />}
  </div>
);
```

### Pattern 4: Delta Sync

```tsx
async function fetchCartDelta(current) {
  if (!current) return fetchFullCart();

  // Only fetch changes since last update
  const response = await fetch(`/api/cart/delta?since=${current.updatedAt}`);
  const delta = await response.json();

  return {
    ...current,
    items: [...current.items, ...delta.newItems],
    updatedAt: Date.now(),
  };
}

const { data } = useSyncedModel(CartModel, fetchCartDelta);
// Default: syncs on mount when stale
```

---

## Best Practices

### DO

- **Use `useSyncedModel` for server-backed data** - Eliminates boilerplate
- **Use default `syncOnMount` for most cases** - Syncs when revisiting stale data
- **Use `syncOnMount: 'always'` for critical data** - Always fetch latest on mount
- **Render skeletons** when `data === null` (cache warming)
- **Show sync indicators** using `isSyncing` and `history.isStale`
- **Handle errors gracefully** with `onError` callback

### DON'T

- **Don't store PII without encryption** (passwords, SSN, credit cards)
- **Don't assume instant availability** (IndexedDB is async)
- **Don't mutate state directly** (always use `patch` or `replace`)
- **Don't ignore version bumps** (provide `initialData`)

---

## Security Notice

**FirstTx does NOT encrypt data at rest.**

- IndexedDB is protected by same-origin policy
- Data is accessible via browser DevTools
- **Do NOT store sensitive information** without additional encryption

For sensitive data, use:

- Session memory (non-persistent)
- Encrypted storage libraries (e.g., `crypto-js`)
- Server-only storage

---

## Troubleshooting

**Q: Why is `data` always `null`?**

The in-memory cache is warming up. This happens on first render, after clearing IndexedDB, or after version mismatch. Render a skeleton/loading state.

**Q: Why isn't my `patch()` reflecting in UI?**

Ensure you're:

1. Using `patch` from the hook (not direct model method)
2. Mutating the draft object (not returning new object)
3. Not blocking React re-render

**Q: How do I handle sync errors?**

Use the `onError` callback:

```tsx
useSyncedModel(Model, fetcher, {
  onError: (error) => {
    console.error('Sync failed:', error);
    toast.error(error.message);
  },
});
```

**Q: Can I use multiple models?**

Yes! Each model is independent:

```tsx
const { data: cart } = useSyncedModel(CartModel, fetchCart);
const { data: user } = useSyncedModel(UserModel, fetchUser);
const { data: products } = useSyncedModel(ProductsModel, fetchProducts);
```

---

## Examples

See the [demo app](../../apps/demo) and [playground](../../apps/playground) for complete examples:

- Cart Page with server sync
- Products page with auto-sync
- Error handling and rollbacks

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Related Packages

- [`@firsttx/tx`](../tx) - Atomic transactions for optimistic updates
- [`@firsttx/prepaint`](../prepaint) - Instant Replay for 0ms blank screens

---

## Links

- [GitHub Repository](https://github.com/joseph0926/firsttx)
- [Issue Tracker](https://github.com/joseph0926/firsttx/issues)
- [Main Documentation](../../README.md)
