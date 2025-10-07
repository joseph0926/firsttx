# @firsttx/tx

> [Main README](https://github.com/joseph0926/firsttx/blob/main/README.md)

Transaction Graph for **atomic** optimistic updates with **commit/rollback** and a **journal** for retries. Designed to compose UI state, cache invalidation, and even routing into a single transaction.

> Status: **experimental** — API may change before stable release.

### Install

```bash
pnpm add @firsttx/tx
```

### Quick start

```ts
import { startTransaction } from '@firsttx/tx';
import { CartModel } from '../models/cart';

export async function addToCart(product: { id: string }) {
  const tx = startTransaction('add-to-cart');

  // optimistic step
  await tx.run(
    async () => {
      await CartModel.patch((d) => {
        const it = d.items.find((x) => x.id === product.id);
        if (it) it.qty += 1;
        else d.items.push({ ...product, title: '', price: 0, qty: 1 });
        d.updatedAt = Date.now();
      });
    },
    {
      compensate: async () => {
        await CartModel.patch((d) => {
          const it = d.items.find((x) => x.id === product.id);
          if (!it) return;
          it.qty -= 1;
          if (it.qty <= 0) d.items = d.items.filter((x) => x.id !== product.id);
          d.updatedAt = Date.now();
        });
      },
    },
  );

  // side effect with retry
  await tx.run(() => api.post('/cart/add', { id: product.id }), {
    retry: { maxAttempts: 3, backoffMs: 400 },
  });

  await tx.commit();
}
```

### Concepts

- **Transaction Graph**: ordered steps with optional dependencies
- **Compensation**: precise, local rollback for each step
- **Journal**: persistence for retries after reload (planned)
- **Integration**: intended to compose model updates, cache tags, route changes

### Caveats

- Early stage; expect breaking changes.
- If you need stability today, use **Local‑First `patch` + compensation** without Tx.
