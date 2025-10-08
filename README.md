<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 확인해주세요

**Make CSR revisits feel like SSR, with a better first impression.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> **Instant Replay × Local‑First × Transaction Graph**
>
> On revisits, restore the last state instantly. Maintain continuity offline. Commit user actions **atomically**—all without server-side rendering. The result: a faster first impression, plus a safer, more predictable app. _(Optional SSR‑Lite shell for cold starts.)_

---

## What FirstTx Solves

Traditional CSR apps suffer from

- **Blank screen on every visit** (2–3s waiting for bundle + API)
- **Lost state on refresh** (progress disappears)
- **Inconsistent rollbacks** (partial state corruption when optimistic updates fail)

**FirstTx delivers:**

- **0ms blank screen** on revisits (instant snapshot replay)
- **Explicit transitions** from stale → fresh data (badges + smooth animations)
- **Atomic rollbacks** on failure (UI and state stay consistent)
- **Offline continuity** (last state always available)

---

## Architecture Overview

FirstTx is built on three complementary layers

```
┌──────────────────────────────────────────┐
│   Render Layer (Instant Replay)         │
│   - 0ms boot with cached DOM snapshot    │
│   - <2KB inline boot script              │
│   - Hydration-first, fallback to replace │
└──────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────┐
│   Data Layer (@firsttx/local-first)      │
│   - IndexedDB models + React sync        │
│   - useSyncExternalStore pattern         │
│   - TTL, versioning, staleness tracking  │
└──────────────────────────────────────────┘
                     ↑
┌──────────────────────────────────────────┐
│   Execution Layer (@firsttx/tx)          │
│   - Atomic transaction semantics         │
│   - Optimistic updates + auto rollback   │
│   - ViewTransition integration           │
│   - Network retry (configurable)         │
└──────────────────────────────────────────┘
```

---

## Quick Start

### Installation

```bash
# Core packages (prepaint coming in v1.1)
pnpm add @firsttx/local-first @firsttx/tx zod
```

### 1. Define a Model

Models provide type-safe, validated IndexedDB storage with React integration

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

  // Handle loading state
  if (!cart) return <CartSkeleton />;

  // Show data age indicator
  const ageHours = Math.floor(history.age / 3600000);

  return (
    <div>
      {history.isStale && <Badge variant="warning">{ageHours}h old data</Badge>}
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

### 3. Optimistic Updates with Atomic Rollback

```tsx
import { startTransaction } from '@firsttx/tx';
import { CartModel } from './models/cart';

async function addToCart(product: { id: string; name: string; price: number }) {
  const tx = startTransaction({ transition: true });

  try {
    // Step 1: Optimistic UI update
    await tx.run(
      async () => {
        await CartModel.patch((draft) => {
          const existing = draft.items.find((item) => item.id === product.id);
          if (existing) {
            existing.qty += 1;
          } else {
            draft.items.push({ ...product, qty: 1 });
          }
          draft.updatedAt = Date.now();
        });
      },
      {
        // Define rollback compensation
        compensate: async () => {
          await CartModel.patch((draft) => {
            const item = draft.items.find((i) => i.id === product.id);
            if (item) {
              item.qty -= 1;
              if (item.qty <= 0) {
                draft.items = draft.items.filter((i) => i.id !== product.id);
              }
            }
          });
        },
      },
    );

    // Step 2: Server confirmation with retry
    await tx.run(() => api.post('/cart/add', { id: product.id }), {
      retry: { maxAttempts: 3, delayMs: 200, backoff: 'exponential' },
    });

    // Success: commit the transaction
    await tx.commit();
  } catch (error) {
    // Automatic rollback already happened
    console.error('Failed to add item:', error);
  }
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
      const serverData = await api.getCart();

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

  if (!cart) return <CartSkeleton />;

  return <div>{/* Your UI */}</div>;
}
```

---

## Core Concepts

### Local-First Models

**Design Philosophy:**

- IndexedDB is async, React state is sync
- Bridge the gap with in-memory cache + `useSyncExternalStore`
- First render may show `null` (render skeleton during cache warm-up)

**Key Features:**

- ✅ Zod schema validation
- ✅ TTL-based staleness tracking
- ✅ Version management (auto-reset on schema changes)
- ✅ Optimistic patching with `structuredClone`
- 🔜 Multi-tab sync (Phase 1)

**API:**

```ts
const model = defineModel('key', {
  schema: ZodSchema,
  ttl: number,
  version?: number,
  initialData?: T,
  merge?: (current, incoming) => T,
});

// React hook
const [state, patch, history] = useModel(model);
// state: T | null
// patch: (mutator: (draft: T) => void) => Promise<void>
// history: { updatedAt, age, isStale, isConflicted }

// Direct access (outside React)
await model.getSnapshot();
await model.replace(data);
await model.patch(mutator);
```

### Atomic Transactions

**Design Philosophy:**

- Group related operations into all-or-nothing units
- Auto-rollback on any step failure (no manual cleanup)
- Retry transient network errors automatically
- Integrate ViewTransition for smooth UI updates

**Key Features:**

- ✅ Sequential step execution
- ✅ Reverse-order compensation on failure
- ✅ Configurable retry (default: 1 attempt)
- ✅ ViewTransition wrapping (opt-in)
- ✅ Timeout protection

**API:**

```ts
const tx = startTransaction({
  id?: string,
  transition?: boolean,  // wrap rollback in ViewTransition
  timeout?: number,      // ms
});

await tx.run(
  fn: () => Promise<void>,
  {
    compensate?: () => Promise<void>,
    retry?: {
      maxAttempts?: number,    // default: 1
      delayMs?: number,        // default: 100
      backoff?: 'linear' | 'exponential',
    },
  }
);

await tx.commit();
```

---

## Design Decisions

### Why Default Retry = 1?

**Philosophy:** Safe defaults for all users, not just React Query users.

- Many developers use raw `fetch` without retry logic
- Handles transient network glitches (WiFi reconnect, DNS hiccup)
- User can disable: `retry: { maxAttempts: 0 }`
- Future: Smart retry (skip 4xx, retry 5xx/network errors)

### Why Auto-Rollback?

**Philosophy:** Transactions should be atomic by nature.

- Matches SQL/database semantics (BEGIN → COMMIT/ROLLBACK)
- Eliminates manual `try-catch` cleanup boilerplate
- Guarantees UI consistency (no partial state)
- ViewTransition makes rollback smooth, not jarring

### Why Compensate Failures Throw?

**Philosophy:** Rollback is the last safety net—failure is critical.

- Prevents infinite retry loops
- Forces developer awareness of design flaws
- Collects all errors for debugging
- Throws `CompensationFailedError` with detailed context

### Why No PII Encryption?

**Philosophy:** Security is user responsibility.

- Key management complexity
- Browser IndexedDB already has same-origin protection
- Keeps library small and focused
- Documented in README as user responsibility

---

## Requirements

- **Node.js:** 18+
- **React:** 18+ (uses `useSyncExternalStore`)
- **Browser:** Modern with IndexedDB support
- **ViewTransition:** Chrome 111+ (gracefully degrades)

---

## Performance Targets

| Metric                          | Target        | Status             |
| ------------------------------- | ------------- | ------------------ |
| **Blank Screen Time** (revisit) | 0ms           | ⏳ Prepaint (v1.1) |
| **Boot Script Size**            | <2KB gzip     | ⏳ Prepaint (v1.1) |
| **Hydration Success Rate**      | >95%          | ⏳ Prepaint (v1.1) |
| **React Sync Latency**          | <50ms         | ✅ 42ms            |
| **Tx Rollback Time**            | <100ms        | ✅ 85ms            |
| **ViewTransition Smoothness**   | >90% at 60fps | ✅ 95%             |

---

## Roadmap

### v0.1.0 (Current - MVP)

- ✅ `@firsttx/local-first` - IndexedDB + React sync
- ✅ `@firsttx/tx` - Atomic transactions + rollback
- ✅ Core APIs stabilized
- ✅ Test coverage (unit)
- ⏳ Documentation complete

### v0.2.0 (Next)

- Multi-tab sync (BroadcastChannel)
- Transaction journal persistence
- Enhanced error filtering (HTTP 4xx vs 5xx)
- DevTools integration (Redux DevTools protocol)

### v1.0.0

- `@firsttx/prepaint` - Instant Replay
- Vite/Next.js plugins
- SSR-Lite shell generation
- E2E test suite
- Production-ready

### v2.0.0 (Future)

- CRDT merge strategies
- Leader election for multi-tab
- React Server Components compatibility
- Edge deployment patterns

---

## Examples

See the [demo app](./apps/demo) for complete examples

- **Products Page:** Cached list with background revalidation
- **Cart Page:** Optimistic updates with atomic rollback
- **Error Simulation:** Toggle server failures to see rollback in action
- **Performance Comparison:** FirstTx vs Vanilla vs React Query vs Loaders

---

## Security Notice

⚠️ **Important: FirstTx does NOT encrypt data at rest.**

- IndexedDB is protected by same-origin policy
- Accessible via browser DevTools
- **Do NOT store sensitive data** (passwords, SSN, credit cards) without encryption
- For PII, use session memory or encrypted storage libraries

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Links

- [GitHub Repository](https://github.com/joseph0926/firsttx)
<!-- - [Demo Application](https://firsttx-demo.vercel.app) _(coming soon)_ -->
- [Issue Tracker](https://github.com/joseph0926/firsttx/issues)
