<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**Make CSR return visits feel like SSR—with a faster first impression**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> **Instant Replay × Local‑First × Transaction Graph**
> Restore the last state instantly on return visits, preserve continuity offline, and commit user actions **atomically** with automatic rollback.
> Achieve a consistent, predictable CSR experience **without SSR**. _(Optional SSR‑Lite shell for cold starts.)_

---

## What’s new in v3.2 — Tx layer integrated

- **Transaction integration**: optimistic update → server confirmation → on failure, **automatic rollback (atomic)**
- **ViewTransition wiring**: smooth transitions for server sync and rollback
- **Built‑in retry**: a sensible default **1 retry** for transient network errors (configurable)
- **Journal awareness**: boot checks for **in‑flight transactions** (extensible for reapply/abort policies)

---

## Problems FirstTx solves

- **Blank screen** on every return visit (2–3s)
- **Lost progress** on refresh
- **Partial rollbacks** when optimistic updates fail

**Outcomes with FirstTx**

- **0ms blank screen** on return (snapshot injection)
- Clear **stale → fresh** handoff with badges and smooth animation
- **Atomic rollback** on failure (UI/state stay consistent)
- **Offline** continuity of last state

---

## Core idea (3 layers)

### 1) Instant Replay (Render)

Before the main bundle arrives, render the actual UI from a local snapshot.

- Boot script target: **< 2KB gzip**
- Hydrate if the DOM matches, otherwise **replace**
- Show a data‑age badge (e.g., “23h old data”) until fresh data arrives

### 2) Local‑First (Data)

Expose IndexedDB models to React **synchronously** via `useSyncExternalStore + in‑memory cache`.

- `useModel(model) → [state, patch, history]`
- `history.isStale`, `history.age` help drive badges/hints
- **Multi‑tab sync** (BroadcastChannel) planned for a later phase

### 3) Tx (Execution)

Group optimistic changes, server effects, and compensation into **one transaction** for **atomic** semantics.

- `run(fn, { compensate, retry })`
- On failure: **automatic rollback** with optional ViewTransition
- Retry defaults to 1 (tunable)

---

## Quick Start

### Install

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### 1) Prepaint (Vite plugin)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import prepaint from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

### 2) Define a model (Local‑First)

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
  // optional
  // version: 1,
  // initialData: { items: [], updatedAt: 0 },
});
```

### 3) Prepaint template (Instant Replay)

```tsx
// routes/cart.prepaint.tsx
'use prepaint';
import { prepaint } from '@firsttx/prepaint';

export default prepaint((ctx) => {
  const items = ctx.snap?.cart?.items ?? [];
  const ageHours = Math.floor((ctx.snapAge ?? 0) / 3600000);

  if (items.length === 0) return <CartSkeleton />;

  return (
    <div className="cart">
      {ageHours > 0 && <span className="muted">{ageHours}h old data</span>}
      {items.map((it) => (
        <CartItem key={it.id} {...it} />
      ))}
    </div>
  );
});
```

### 4) App handoff

```ts
// main.tsx
import { handoff } from '@firsttx/prepaint';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const root = document.getElementById('root')!;
  if (strategy === 'hydrate-match') {
    hydrateRoot(root, <App />);
  } else {
    createRoot(root).render(<App />);
  }
});
```

### 5) Optimistic update + atomic rollback with Tx

```tsx
// routes/CartPage.tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { startTransaction } from '@firsttx/tx';
import { CartModel } from '../models/cart';

export default function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <CartSkeleton />; // cache warming

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

  // Tx for "+1"
  const addOne = async (product: { id: string }) => {
    const tx = startTransaction({ transition: true });

    try {
      // Step 1: optimistic patch
      await tx.run(
        async () => {
          await patch((d) => {
            const it = d.items.find((x) => x.id === product.id);
            if (it) it.qty += 1;
            else d.items.push({ ...product, title: '', price: 0, qty: 1 });
            d.updatedAt = Date.now();
          });
        },
        {
          compensate: async () => {
            await patch((d) => {
              const it = d.items.find((x) => x.id === product.id);
              if (!it) return;
              it.qty -= 1;
              if (it.qty <= 0) d.items = d.items.filter((x) => x.id !== product.id);
              d.updatedAt = Date.now();
            });
          },
        },
      );

      // Step 2: server confirmation (with retry)
      await tx.run(() => api.post('/cart/add', { id: product.id }), {
        retry: { maxAttempts: 3, delayMs: 200, backoff: 'exponential' },
      });

      await tx.commit();
      toast.success('Added');
    } catch {
      // Tx performs automatic rollback on failure
      toast.error('Add failed');
    }
  };

  return (
    <div>
      {history.isStale && (
        <Badge variant="warning">{Math.floor(history.age / 3600000)}h old data</Badge>
      )}

      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} onAdd={() => addOne(item)} />
      ))}
    </div>
  );
}
```

---

## Performance targets

| Metric                    | Target       | Notes                                  |
| ------------------------- | ------------ | -------------------------------------- |
| BlankScreenTime           | 0ms (return) | Snapshot DOM injection during boot     |
| Prepaint Boot Size        | < 2KB gzip   | Inline boot script                     |
| Hydration Success         | > 95%        | Fallback to replace on mismatch        |
| React Sync Latency        | < 50ms       | subscribe → render via in‑memory cache |
| ViewTransition Smoothness | > 90% @60fps | Applied for sync/rollback              |
| Tx Rollback Time          | < 100ms      | Error → UI restored                    |

---

## Feature Matrix (text‑only)

| Item                | Traditional CSR | SSR/RSC      | FirstTx (v3.2)                  |
| ------------------- | --------------- | ------------ | ------------------------------- |
| First visit         | 2–3s            | Instant      | 2–3s (Skeleton/SSR‑Lite option) |
| Return visit        | 2–3s            | Instant      | 0ms (Snapshot)                  |
| Data freshness      | Fresh post‑load | Always fresh | Stale→Fresh transition          |
| Offline last state  | No              | No           | Yes                             |
| Optimistic rollback | Fragmented      | Complex      | Atomic                          |
| Server requirement  | None            | Required     | None                            |

---

## When to use

**Great fit**

- **B2B dashboards/admin tools** visited dozens of times per day
- Apps needing **offline resilience** on unstable networks (field/mobile)
- Workflows where **continuity across refresh/tab switches** matters

**Not ideal**

- **SEO‑critical** surfaces (landing/blog) → prefer SSR/RSC
- **Ultra‑low‑latency** trading/streaming → specialized stacks
- **Static content** → SSG

---

## Architecture (high level)

```
┌─────────────────────────────────────┐
│ Instant Replay (Render)             │
│ Boot → Snapshot → DOM               │
└─────────────────────────────────────┘
                 ↓ read
┌─────────────────────────────────────┐
│ Local‑First (Data)                  │
│ IndexedDB + In‑mem cache (React)    │
│ (Multi‑tab sync planned)            │
└─────────────────────────────────────┘
                 ↑ write
┌─────────────────────────────────────┐
│ Tx (Execution)                      │
│ Optimistic → Atomic rollback        │
│ Retry + ViewTransition              │
└─────────────────────────────────────┘
```

**Flow recap**

1. **Boot**: read snapshot/journal and paint instantly → 0ms blank screen
2. **Handoff**: attempt hydration; replace with ViewTransition on mismatch
3. **Sync**: apply server data inside a transition for a smooth update
4. **Interaction**: Tx handles optimistic patch → server effect → auto‑rollback on failure

---

## Security note (PII)

- FirstTx does **not** ship built‑in encryption/access control.
- IndexedDB relies on same‑origin protections.
- Store sensitive data **encrypted** or keep it **in memory only**.

---

## License

MIT

---

## Contact

- **Repository**: [github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- **Email**: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)

---

## Browser/Runtime requirements

- View Transitions: **Chrome 111+** recommended (fallbacks provided)
- React 18+, Node 18+
- IndexedDB‑capable environment
