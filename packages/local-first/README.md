# @firsttx/local-first

**Local‑First models for React.** Bridge **IndexedDB (async)** and **React state (sync)** via `useSyncExternalStore` and an in‑memory cache. Works hand‑in‑hand with Prepaint (snapshot handoff) and Tx (atomic commits/rollbacks).

- **Hook**: `useModel(model) → [state, patch, history]`
- **History**: `isStale`, `age`, `updatedAt` for UI hints/badges
- **Planned**: multi‑tab sync via BroadcastChannel (Phase 1)
- **Requirements**: React 18+, Node 18+

---

## Install

```bash
pnpm add @firsttx/local-first zod
```

---

## Define a model

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
  // merge: (current, incoming) => incoming,
});
```

---

## Use in React

```tsx
// routes/CartPage.tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { CartModel } from '../models/cart';

export default function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <CartSkeleton />; // in‑memory cache warming

  // server sync → smooth stale→fresh transition
  useEffect(() => {
    (async () => {
      const server = await api.getCart();
      if (!cart || server.updatedAt > cart.updatedAt) {
        const apply = () =>
          patch((d) => {
            d.items = server.items;
            d.updatedAt = server.updatedAt;
          });
        if ('startViewTransition' in document) {
          document.startViewTransition(apply);
        } else {
          await apply();
        }
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

---

## API (at a glance)

**Model definition**

```ts
defineModel<T>(name: string, options: {
  schema: ZodSchema<T>;
  ttl?: number;
  version?: number;
  initialData?: T;
  merge?: (current: T, incoming: T) => T;
})
```

**Model methods**

- `getSnapshot(): Promise<T|null>`
- `replace(data: T): Promise<void>`
- `patch(mutator: (draft: T) => void): Promise<void>`
- `getHistory(): Promise<ModelHistory>`
- `getCachedSnapshot(): T|null` (sync)
- `subscribe(fn: () => void): () => void`

**React hook**

- `useModel(model) → [state: T|null, patch: Function, history: ModelHistory]`

---

## Tips

- Initial renders may receive `null` while the cache warms—render a skeleton.
- Keep PII out of persistent storage or encrypt at rest.
- Pair with `@firsttx/tx` for **atomic** optimistic updates and automatic rollback.

---

## License

MIT
