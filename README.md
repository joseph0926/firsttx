# FirstTx

**Make your CSR app's return visits feel like SSR**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> Instantly restore the last state on second visit and safely rollback optimistic updates—all without a server.

---

## The Problem FirstTx Solves

**Chronic issues in CSR apps:**

```
❌ Blank screen on every return visit (2-3s wait)
❌ Lost work state on refresh
❌ Partial rollbacks when optimistic updates fail
```

**FirstTx's solution:**

```
✅ Restore last state in 0ms on return visits
✅ Preserve work state even offline
✅ Atomic rollback for perfect consistency
```

---

## Core Idea

FirstTx is an integrated system with three layers working together:

### Prepaint (Render Layer)

Before the main bundle arrives, a tiny boot runner (2-5KB) reads local snapshots to **render the screen with real data in 0ms.**

### Local-First (Data Layer)

IndexedDB-based models store state and **auto-sync across tabs.** TTL and PII policies ensure safety.

### Tx (Execution Layer)

Bundles mutations, routing, and cache invalidation into **one transaction** with **atomic commit/rollback.**

---

## Quick Start

### Installation

```bash
pnpm add @fristtx/prepaint @fristtx/local-first @fristtx/tx
```

### 1. Vite Plugin Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import prepaint from '@fristtx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

### 2. Define Models

```typescript
// models/cart.ts
import { defineModel } from '@fristtx/local-first';
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
  }),
  ttl: 5 * 60 * 1000, // 5 minutes
});
```

### 3. Write Prepaint Templates

```tsx
// routes/cart.prepaint.tsx
'use prepaint';
import { prepaint } from '@fristtx/prepaint';

export default prepaint((ctx) => {
  const items = ctx.snap?.cart?.items ?? [];
  const ageHours = Math.floor(ctx.snapAge / 3600000);

  if (items.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className="cart">
      {ageHours > 0 && <span className="text-gray-500">{ageHours}h old data</span>}
      {items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
});
```

### 4. Optimistic Updates with Transactions

```typescript
import { startTransaction } from '@fristtx/tx';
import { CartModel } from './models/cart';

async function addToCart(product) {
  const tx = startTransaction('add-to-cart');

  // Optimistic patch
  await tx.run(
    async () => {
      await CartModel.patch((draft) => {
        const item = draft.items.find((x) => x.id === product.id);
        if (item) item.qty += 1;
        else draft.items.push({ ...product, qty: 1 });
      });
    },
    {
      compensate: async () => {
        await CartModel.patch((draft) => {
          const item = draft.items.find((x) => x.id === product.id);
          if (!item) return;
          item.qty -= 1;
          if (item.qty <= 0) {
            draft.items = draft.items.filter((x) => x.id !== product.id);
          }
        });
      },
    },
  );

  // Server confirmation
  await tx.run(() => api.post('/cart/add', { id: product.id }), {
    retry: { maxAttempts: 3 },
  });

  await tx.commit();
}
```

### 5. App Handoff

```typescript
// main.tsx
import { handoff } from '@fristtx/prepaint'

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const container = document.getElementById('root')!

  if (strategy === 'hydrate-match') {
    hydrateRoot(container, <App />)
  } else {
    createRoot(container).render(<App />)
  }
})
```

Done! Last state now instantly restores on return visits. 🎉

---

## Performance Comparison

| Scenario                | Traditional CSR | SSR/RSC       | FirstTx                 |
| ----------------------- | --------------- | ------------- | ----------------------- |
| **First Visit**         | 🐌 2-3s         | ⚡ Instant    | 🐌 2-3s (skeleton)      |
| **Return Visit**        | 🐌 2-3s         | ⚡ Instant    | ⚡ 0ms (real data)      |
| **Offline**             | ❌ Impossible   | ❌ Impossible | ✅ Last state preserved |
| **Server Cost**         | ✅ None         | ❌ High       | ✅ None                 |
| **Optimistic Rollback** | ⚠️ Fragmented   | ⚠️ Complex    | ✅ Atomic               |

---

## When to Use

### ✅ Good Fit

**B2B SaaS Dashboards**

- Employees accessing dozens of times daily
- 2s × 50 visits = 33 min/month wasted

**Internal Admin/Operations Tools**

- Eliminate wait time when customers call
- Unstable networks (warehouses, stores)

**Field Work Apps**

- Construction/healthcare/logistics with unstable mobile networks
- Auto-sync after offline work

### ❌ Poor Fit

**SEO-Critical Apps**

- Landing pages, blogs → Use SSR/RSC

**Ultra-Low Latency Requirements**

- Real-time trading systems → Use WebSocket

**Static Content**

- Documentation sites → Use SSG

---

## Architecture

```
┌─────────────────────────────────────┐
│   Prepaint (Render Layer)           │
│   Boot runner → Snapshot → DOM      │
└─────────────────────────────────────┘
                 ↓ read
┌─────────────────────────────────────┐
│   Local-First (Data Layer)          │
│   IndexedDB + Multi-tab sync        │
└─────────────────────────────────────┘
                 ↑ write
┌─────────────────────────────────────┐
│   Tx (Execution Layer)              │
│   Optimistic updates + Atomic rollback │
└─────────────────────────────────────┘
```

**Data Flow:**

1. **Boot**: HTML → Boot runner → Snapshot → Prepaint DOM
2. **Handoff**: Main app → Hydrate/replace → React activation
3. **Interaction**: Tx start → Optimistic patch → Server → Commit/rollback

---

## License

MIT

---

## Contact

- **Repository**: [github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- **Email**: joseph0926.dev@gmail.com
