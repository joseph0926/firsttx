# @firsttx/local-first

> [Main README](https://github.com/joseph0926/firsttx/blob/main/README.md)

Local‑First models for React that **bridge IndexedDB (async)** and **React state (sync)** using `useSyncExternalStore` + an in‑memory cache. Zero‑server return visits with snapshot handoff; offline resilient by design.

- **Hook**: `useModel(model) → [state, patch, history]`
- **Cache**: in‑memory cache provides synchronous reads
- **History**: `isStale`, `age`, `updatedAt`
- **Multi‑tab sync**: planned (BroadcastChannel, Phase 1)

### Install

```bash
pnpm add @firsttx/local-first zod
```

### Define a model

```ts
// models/cart.ts
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

export const CartModel = defineModel('cart', {
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        price: z.number(),
        qty: z.number(),
      }),
    ),
    updatedAt: z.number().default(0),
  }),
  ttl: 5 * 60 * 1000, // 5 minutes
  // optional:
  // version: 1,
  // initialData: { items: [], updatedAt: 0 },
});
```

### Use in React

```tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { CartModel } from '../models/cart';

export default function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <CartSkeleton />; // cache warming

  // server → smooth stale→fresh transition
  useEffect(() => {
    (async () => {
      const server = await api.getCart();
      if (!cart || server.updatedAt > cart.updatedAt) {
        const apply = () =>
          patch((d) => {
            d.items = server.items;
            d.updatedAt = server.updatedAt;
          });
        if (document.startViewTransition) document.startViewTransition(apply);
        else await apply();
      }
    })();
  }, [cart, patch]);

  return (
    <>
      {history.isStale && <Badge>{Math.floor(history.age / 3600000)}h old data</Badge>}
      {cart.items.map((it) => (
        <CartItem key={it.id} {...it} />
      ))}
    </>
  );
}
```

### API (at a glance)

- `defineModel(name, { schema, ttl, version?, initialData? })`
- Model methods:
  `getSnapshot(): Promise<T|null>` · `replace(data): Promise<void>` ·
  `patch(mutator): Promise<void>` · `getHistory(): Promise<ModelHistory>` ·
  `getCachedSnapshot(): T|null` · `subscribe(fn): () => void`
