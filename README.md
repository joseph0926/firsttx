<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**Make your CSR app’s return visits feel like SSR**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> Instantly restore the last state on return visits and surface clear “stale → fresh” transitions.
> Built on **Instant Replay (Render)** + **Local‑First (React‑integrated)**, with **Tx (atomic rollback)** planned.

---

## The Problem FirstTx Solves

**Chronic issues in CSR apps:**

```
❌ Blank screen on every return visit (2–3s wait)
❌ Lost work state on refresh
❌ Partial or inconsistent rollbacks when optimistic updates fail
```

**FirstTx’s approach (v3.1):**

```
✅ 0ms blank-screen on return visits via Instant Replay (snapshot)
✅ Preserve last work state even offline
✅ Explicit “stale → fresh” visuals with smooth View Transitions
```

> Info: **Atomic rollback (Tx layer)** is **planned/experimental** at this stage.
> Today, you can use optimistic `patch` + compensation. A dedicated Tx API will follow.

---

## Core Idea (Three Layers)

### 1) Instant Replay (Render Layer)

A tiny inline boot script reads local snapshots and **paints real UI immediately**, before your main bundle loads. If no snapshot is available, fall back to **SSR‑Lite shell or CSR skeleton**.

- Target boot size: **< 2KB gzip**
- Shows **age badges** (e.g., “23h old data”) until server sync arrives.
- Hydration-first: tries to **hydrate and reuse** the prepainted DOM; falls back to replace with **View Transitions**.

### 2) Local‑First (Data Layer)

Models are stored in IndexedDB and exposed to React via **`useSyncExternalStore + in‑memory cache`** so components can read **synchronously**.

- **`useModel(model)` → `[state, patch, history]`**
- `history.isStale`, `history.age` help drive UI (badges, hints)
- **Multi‑tab sync via BroadcastChannel is planned (Phase 1)**

### 3) Tx (Execution Layer) — _Planned / Experimental_

One‑transaction bundling of optimistic updates, routing, and cache invalidation with **atomic commit/rollback** and a **journal** for retries.

- Not part of the stable v3.1 baseline yet.
- Early adopters may experiment; APIs may change.

---

## Quick Start

### Installation

```bash
pnpm add @firsttx/prepaint @firsttx/local-first
# (optional, experimental)
# pnpm add @firsttx/tx
```

### 1) Vite Plugin (Prepaint)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import prepaint from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

### 2) Define a Model

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
  // (optional) versioning helps with migrations
  // version: 1,
  // initialData: { items: [], updatedAt: 0 },
});
```

### 3) Prepaint Template (Instant Replay UI)

```tsx
// routes/cart.prepaint.tsx
'use prepaint';
import { prepaint } from '@firsttx/prepaint';

export default prepaint((ctx) => {
  const items = ctx.snap?.cart?.items ?? [];
  const ageHours = Math.floor((ctx.snapAge ?? 0) / 3600000);

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

### 4) Use the Model in React (v3.1)

```tsx
// routes/CartPage.tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { CartModel } from '../models/cart';

export default function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  // Show skeleton while the in-memory cache warms up
  if (!cart) return <CartSkeleton />;

  // Server sync → smooth stale→fresh transition
  useEffect(() => {
    (async () => {
      const server = await api.getCart();
      if (!cart || server.updatedAt > cart.updatedAt) {
        const apply = () =>
          patch((draft) => {
            draft.items = server.items;
            draft.updatedAt = server.updatedAt;
          });
        if (document.startViewTransition) {
          document.startViewTransition(apply);
        } else {
          await apply();
        }
      }
    })();
  }, [cart, patch]);

  return (
    <div>
      {history.isStale && (
        <Badge variant="warning">{Math.floor(history.age / 3600000)}h old data</Badge>
      )}

      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

### 5) App Handoff

```ts
// main.tsx
import { handoff } from '@firsttx/prepaint';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const container = document.getElementById('root')!;
  if (strategy === 'hydrate-match') {
    hydrateRoot(container, <App />);
  } else {
    createRoot(container).render(<App />);
  }
});
```

---

## Optimistic Updates Today (without Tx)

Until the Tx layer stabilizes, use **optimistic `patch` + compensation**:

```ts
async function addToCart(product) {
  // optimistic UI
  await CartModel.patch((draft) => {
    const existing = draft.items.find((x) => x.id === product.id);
    if (existing) existing.qty += 1;
    else draft.items.push({ ...product, qty: 1 });
    draft.updatedAt = Date.now();
  });

  try {
    await api.post('/cart/add', { id: product.id });
  } catch (e) {
    // compensate
    await CartModel.patch((draft) => {
      const item = draft.items.find((x) => x.id === product.id);
      if (!item) return;
      item.qty -= 1;
      if (item.qty <= 0) {
        draft.items = draft.items.filter((x) => x.id !== product.id);
      }
      draft.updatedAt = Date.now();
    });
    toast.error('Add failed');
  }
}
```

> Experimental Tx API
> If you want to try atomic transactions early:
>
> ```bash
> pnpm add @firsttx/tx
> ```
>
> APIs are subject to change; expect breaking changes before stable release.

---

## Performance Targets (v3.1)

| Metric                    | Target       | Notes                               |
| ------------------------- | ------------ | ----------------------------------- |
| BlankScreenTime           | 0ms (return) | Snapshot injected during boot       |
| Prepaint Boot Size        | < 2KB gzip   | Inline boot script                  |
| Hydration Success         | > 95%        | Fallback to replace on mismatch     |
| React Sync Latency        | < 50ms       | subscribe → render via in‑mem cache |
| ViewTransition Smoothness | > 90% @60fps | When supported (Chrome 111+)        |

---

## Feature Matrix

| Scenario/Feature    | Traditional CSR | SSR/RSC | FirstTx (v3.1)           |
| ------------------- | --------------- | ------- | ------------------------ |
| First Visit         | 2–3s            | Instant | 2–3s (skeleton/SSR‑Lite) |
| Return Visit        | 2–3s            | Instant | 0ms (snapshot)           |
| Offline last state  | No              | No      | Yes                      |
| Server requirement  | None            | High    | None                     |
| Optimistic rollback | Fragmented      | Complex | Experimental / Planned   |

---

## When to Use

**Great fit**

- B2B SaaS dashboards accessed dozens of times daily
  → _2s × 50 visits ≈ 33 min/month saved_
- Internal admin/ops tools (unstable/cellular networks)
- Field apps (construction/healthcare/logistics) needing offline resilience

**Not ideal**

- SEO‑critical surfaces (LPs/blogs) → consider SSR/RSC
- Ultra‑low‑latency trading/streaming → specialized stacks
- Static content → SSG

---

## Architecture (High‑Level)

```
┌─────────────────────────────────────┐
│ Instant Replay (Render Layer)       │
│ Boot → Snapshot → DOM               │
└─────────────────────────────────────┘
                 ↓ read
┌─────────────────────────────────────┐
│ Local‑First (Data Layer)            │
│ IndexedDB + in‑memory cache (React) │
│ (Multi‑tab sync: Phase 1 planned)   │
└─────────────────────────────────────┘
                 ↑ write
┌─────────────────────────────────────┐
│ Tx (Execution Layer)                │
│ Optimistic → Atomic rollback (exp.) │
└─────────────────────────────────────┘
```

**Data Flow**

1. **Boot**: HTML → boot script → read snapshot/journal → paint DOM (0ms blank)
2. **Handoff**: main bundle → hydrate (reuse DOM) or replace (View Transition)
3. **Sync**: server data arrives → patch model → subscribers update → smooth transition
4. **Interaction**: optimistic patch; Tx layer will provide atomicity (planned)

---

## License

MIT

---

## Contact

- **Repository**: [github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- **Email**: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)

---

### Note on Browser Support

- View Transitions require **Chrome 111+**; graceful fallbacks are provided.
- `useSyncExternalStore` requires **React 18+**.
