# @firsttx/local-first

**Bridge IndexedDB (async) and React state (sync) seamlessly.**

Local-First provides type-safe IndexedDB models that integrate with React using `useSyncExternalStore` and an in-memory cache pattern. Works hand-in-hand with `@firsttx/tx` for atomic optimistic updates and automatic rollbacks.

[![npm version](https://img.shields.io/npm/v/@firsttx/local-first.svg)](https://www.npmjs.com/package/@firsttx/local-first)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Features

- ✅ **React 18+ Integration:** Uses `useSyncExternalStore` for optimal rendering
- ✅ **Type Safety:** Zod schema validation for all data operations
- ✅ **Staleness Tracking:** Built-in TTL and data age indicators
- ✅ **Version Management:** Auto-reset when schema versions change
- ✅ **Optimistic Updates:** Fast local mutations with `patch()`
- 🔜 **Multi-tab Sync:** BroadcastChannel support (Phase 1)

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

### 2. Use in React Components

```tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  // Handle initial loading state
  if (!cart) {
    return <div>Loading cart from IndexedDB...</div>;
  }

  // Show staleness indicator
  const ageMinutes = Math.floor(history.age / 60000);

  return (
    <div>
      {history.isStale && <div className="warning">Data is {ageMinutes} minutes old</div>}

      <h1>Cart ({cart.items.length} items)</h1>

      {cart.items.map((item) => (
        <div key={item.id}>
          <span>{item.name}</span>
          <span>${item.price}</span>
          <span>Qty: {item.qty}</span>
        </div>
      ))}
    </div>
  );
}
```

### 3. Update Data with `patch()`

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

### 4. Server Sync with ViewTransition

```tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const [cart, patch] = useModel(CartModel);

  // Sync with server in background
  useEffect(() => {
    (async () => {
      const serverData = await fetch('/api/cart').then((r) => r.json());

      if (!cart || serverData.updatedAt > cart.updatedAt) {
        // Smooth transition from stale to fresh
        if ('startViewTransition' in document) {
          await document.startViewTransition(() =>
            patch((draft) => {
              draft.items = serverData.items;
              draft.updatedAt = serverData.updatedAt;
            }),
          ).finished;
        } else {
          await patch((draft) => {
            draft.items = serverData.items;
            draft.updatedAt = serverData.updatedAt;
          });
        }
      }
    })();
  }, [cart, patch]);

  if (!cart) return <div>Loading...</div>;

  return <div>{/* Your UI */}</div>;
}
```

---

## API Reference

### `defineModel(name, options)`

Creates a new model with IndexedDB persistence.

**Parameters:**

- `name` (string): Unique identifier for the model (used as IndexedDB key)
- `options` - `schema` (ZodSchema): Zod schema for validation
  - `ttl` (number): Time-to-live in milliseconds (for staleness tracking)
  - `version?` (number): Schema version (changes trigger data reset)
  - `initialData?` (T): Default data when none exists (required if `version` is set)
  - `merge?` (function): Custom merge strategy `(current, incoming) => T`

**Returns:** `Model<T>`

**Example:**

```ts
const UserModel = defineModel('user', {
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  ttl: 10 * 60 * 1000, // 10 minutes
  version: 1,
  initialData: { id: '', name: '', email: '' },
});
```

---

### `useModel(model)`

React hook for subscribing to model changes.

**Parameters:**

- `model` (Model<T>): The model to subscribe to

**Returns:** `[state, patch, history]`

- `state` (T | null): Current model state (null during initial load)
- `patch` (function): `(mutator: (draft: T) => void) => Promise<void>`
- `history` (ModelHistory): Metadata about the data
  - `updatedAt` (number): Last update timestamp
  - `age` (number): Age in milliseconds
  - `isStale` (boolean): Whether data exceeds TTL
  - `isConflicted` (boolean): Multi-tab conflict indicator (Phase 1)

**Example:**

```tsx
function MyComponent() {
  const [data, patch, history] = useModel(MyModel);

  if (!data) return <Skeleton />;

  const handleUpdate = async () => {
    await patch((draft) => {
      draft.someField = 'new value';
    });
  };

  return (
    <div>
      {history.isStale && <Badge>Stale data</Badge>}
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
}
```

---

### Model Methods (Direct Access)

For use outside of React components

#### `model.getSnapshot()`

```ts
const data = await model.getSnapshot();
// Returns: T | null
```

#### `model.replace(data)`

```ts
await model.replace({ items: [], updatedAt: Date.now() });
// Replaces entire stored data
```

#### `model.patch(mutator)`

```ts
await model.patch((draft) => {
  draft.items.push(newItem);
});
// Mutates data using Immer-style draft
```

#### `model.getHistory()`

```ts
const history = await model.getHistory();
// Returns: ModelHistory
```

#### `model.getCachedSnapshot()` (sync)

```ts
const data = model.getCachedSnapshot();
// Returns: T | null (from in-memory cache)
```

#### `model.subscribe(callback)`

```ts
const unsubscribe = model.subscribe(() => {
  console.log('Model updated!');
});
// Later: unsubscribe()
```

---

## Design Patterns

### Pattern 1: Stale-While-Revalidate

Show cached data immediately, sync in background

```tsx
function ProductsPage() {
  const [products, patch, history] = useModel(ProductsModel);
  const [isRevalidating, setIsRevalidating] = useState(false);

  useEffect(() => {
    (async () => {
      if (!products || history.isStale) {
        setIsRevalidating(true);
        const fresh = await api.getProducts();
        await patch((draft) => {
          draft.items = fresh;
          draft.lastSync = Date.now();
        });
        setIsRevalidating(false);
      }
    })();
  }, [products, history.isStale, patch]);

  if (!products) return <Skeleton />;

  return (
    <div>
      {isRevalidating && <Spinner />}
      {products.items.map((p) => (
        <ProductCard key={p.id} {...p} />
      ))}
    </div>
  );
}
```

### Pattern 2: Optimistic Updates with Tx

Combine with `@firsttx/tx` for atomic operations

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

### Pattern 3: Version Migration

Auto-reset when schema changes

```ts
// v1
const UserModel = defineModel('user', {
  version: 1,
  initialData: { name: '' },
  schema: z.object({ name: z.string() }),
  ttl: Infinity,
});

// v2: add email field
const UserModel = defineModel('user', {
  version: 2, // changed!
  initialData: { name: '', email: '' },
  schema: z.object({
    name: z.string(),
    email: z.string(), // new field
  }),
  ttl: Infinity,
});
// Old data (v1) automatically deleted, initialData used
```

---

## Best Practices

### ✅ DO

- **Use `initialData` with `version`** for safe schema evolution
- **Render skeletons** when `state === null` (cache warming)
- **Show staleness indicators** using `history.isStale` and `history.age`
- **Wrap server syncs in ViewTransition** for smooth updates
- **Keep models small** (avoid huge objects, consider splitting)

### ❌ DON'T

- **Don't store PII without encryption** (passwords, SSN, credit cards)
- **Don't assume instant availability** (IndexedDB is async)
- **Don't mutate state directly** (always use `patch` or `replace`)
- **Don't ignore version bumps** (provide `initialData` to prevent crashes)

---

## Security Notice

⚠️ **FirstTx does NOT encrypt data at rest.**

- IndexedDB is protected by same-origin policy
- Data is accessible via browser DevTools
- **Do NOT store sensitive information** without additional encryption
- For PII, use - Session memory (non-persistent)
  - Encrypted storage libraries (e.g., `crypto-js`)
  - Server-only storage

**Example (encrypt before storing):**

```ts
import CryptoJS from 'crypto-js';

const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(sensitiveData), userPassword).toString();

await SecureModel.replace({ encrypted: encryptedData });
```

---

## Troubleshooting

### Q: Why is `state` always `null`?

**A:** The in-memory cache is warming up. This happens on

- First render (IndexedDB read is async)
- After clearing IndexedDB
- After version mismatch (data was deleted)

**Solution:** Render a skeleton/loading state.

### Q: Why isn't my `patch()` reflecting in UI?

**A:** Make sure you're

1. Using `patch` from `useModel` (not direct model method)
2. Mutating the draft object (not returning new object)
3. Not blocking React re-render (check React DevTools)

### Q: How do I handle errors?

**A:** Validation errors throw `ValidationError`

```tsx
try {
  await model.replace(invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Schema validation failed:', error.zodError);
  }
}
```

### Q: Can I use multiple models?

**A:** Yes! Each model is independent

```tsx
const [cart] = useModel(CartModel);
const [user] = useModel(UserModel);
const [products] = useModel(ProductsModel);
```

---

## Examples

See the [demo app](../../apps/demo) for complete examples

- **Cart Page:** Full CRUD with optimistic updates
- **Products Page:** Stale-while-revalidate pattern
- **Error Handling:** Validation failures and rollbacks

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Related Packages

- [`@firsttx/tx`](../tx) - Atomic transactions for optimistic updates
- `@firsttx/prepaint` _(coming soon)_ - Instant Replay for 0ms blank screens

---

## Links

- [GitHub Repository](https://github.com/joseph0926/firsttx)
- [Issue Tracker](https://github.com/joseph0926/firsttx/issues)
- [Main Documentation](../../README.md)
