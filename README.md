<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**Making CSR App Revisits Feel Like SSR**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)

> From the second visit onwards, instantly restore the last state and safely rollback optimistic updates—delivering fast, consistent experiences without server infrastructure.

---

## 📋 Table of Contents

- [Core Value](#-core-value)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Packages](#-packages)
- [Key Features](#-key-features)
- [Performance Targets](#-performance-targets)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Core Value

### The Problem: CSR Revisit Experience

```
Every visit: blank screen → API wait → data display
Refresh loses progress
Optimistic update failures cause partial rollback inconsistencies
```

### The Solution: FirstTx = Prepaint + Local-First + Tx

```
[Revisit Scenario]
1. Revisit /cart → instantly show yesterday's 3 items (0ms)
2. Main app loads → React hydration → reuse snapshot DOM
3. Server sync → smooth update via ViewTransition (3 → 5 items)
4. "+1" click → Tx starts → optimistic patch → server error
5. Auto rollback → smooth return to original state via ViewTransition
```

**Results:**

- ⚡ Blank screen time on revisit = 0ms
- 🎨 Smooth animations when transitioning from snapshot to fresh data
- 🔄 Consistent atomic rollback on optimistic update failures
- 📴 Last state persists even offline

---

## 🚀 Quick Start

### Installation

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### Basic Usage (Zero-Config)

#### 1. Define Model

```tsx
// models/cart-model.ts
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
  }),
  ttl: 5 * 60 * 1000, // 5 minutes
});
```

#### 2. Main App Entry Point

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

#### 3. React Component

```tsx
// pages/cart-page.tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from '@/models/cart-model';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <Skeleton />;

  return (
    <div>
      <p>Last updated: {new Date(history.updatedAt).toLocaleString()}</p>
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

#### 4. Optimistic Updates (Tx)

```tsx
// actions/add-to-cart.ts
import { startTransaction } from '@firsttx/tx';
import { CartModel } from '@/models/cart-model';

async function addItem(product: Product) {
  const tx = startTransaction({ transition: true });

  // Step 1: Optimistic patch
  await tx.run(
    () =>
      CartModel.patch((draft) => {
        draft.items.push({ ...product, qty: 1 });
      }),
    {
      // Compensation function executed on rollback
      compensate: () =>
        CartModel.patch((draft) => {
          draft.items.pop();
        }),
    },
  );

  // Step 2: Server request
  await tx.run(() => api.post('/cart/add', { id: product.id }));

  // Commit (on success) or auto rollback (on failure)
  await tx.commit();
}
```

---

## 🏗️ Architecture

### Three-Layer System

```
┌──────────────────────────────────────────┐
│   Render Layer (Prepaint)                │
│   - Instant Replay (0ms restoration)     │
│   - beforeunload capture                 │
│   - React delegated hydration            │
└──────────────────────────────────────────┘
                     ↓ read
┌──────────────────────────────────────────┐
│   Local-First (Data Layer)               │
│   - IndexedDB snapshot/model management  │
│   - React integration (useSyncExtStore)  │
│   - Memory cache pattern                 │
└──────────────────────────────────────────┘
                     ↑ write
┌──────────────────────────────────────────┐
│   Tx (Execution Layer)                   │
│   - Optimistic updates                   │
│   - Atomic rollback                      │
│   - ViewTransition integration           │
└──────────────────────────────────────────┘
```

### Data Flow

```
[Boot - 0ms]
HTML load → Prepaint boot → IndexedDB snapshot read → DOM instant injection

[Handoff - 500ms]
Main app load → createFirstTxRoot() → React hydration → DOM reuse

[Sync - 800ms]
Server sync → ViewTransition wrap → smooth update

[Interaction]
User action → Tx start → optimistic patch → server request → success/fail → commit/rollback
```

---

## 📦 Packages

### [`@firsttx/prepaint`](./packages/prepaint)

**Render Layer - Instant Replay System**

- `boot()` - Boot script (IndexedDB → DOM injection)
- `createFirstTxRoot()` - React integration helper
- `handoff()` - Strategy decision (has-prepaint | cold-start)
- `setupCapture()` - beforeunload capture

### [`@firsttx/local-first`](./packages/local-first)

**Data Layer - IndexedDB + React Integration**

- `defineModel()` - Model definition (schema, TTL, version)
- `useModel()` - React hook (useSyncExternalStore-based)
- Memory cache pattern (sync/async bridge)
- TTL/version/history management

### [`@firsttx/tx`](./packages/tx)

**Execution Layer - Optimistic Updates + Atomic Rollback**

- `startTransaction()` - Start transaction
- `tx.run()` - Add step (compensate support)
- `tx.commit()` - Commit
- Auto rollback (on failure)
- Retry logic (1 retry by default)
- ViewTransition integration

---

## ✨ Key Features

### 1. Instant Replay (0ms Restoration)

**Instantly restore last state on revisit**

```tsx
// Runs before main bundle arrives (boot script)
import { boot } from '@firsttx/prepaint';
boot(); // IndexedDB → instant DOM injection (0ms)
```

### 2. Memory Cache Pattern

**IndexedDB (async) ↔ React (sync) Bridge**

```tsx
// Inside Model
let cache: T | null = null
const subscribers = new Set<() => void>()

// Load IndexedDB on first subscription
subscribe(callback) → update cache → notifySubscribers()

// React reads synchronously
getCachedSnapshot() → cache (sync!)
```

### 3. Atomic Rollback

**All succeed or all fail (with ViewTransition)**

```tsx
const tx = startTransaction({ transition: true })

await tx.run(() => CartModel.patch(...), {
  compensate: () => CartModel.patch(...) // Runs on rollback
})

await tx.run(() => api.post(...))

await tx.commit() // Auto rollback on failure (wrapped with ViewTransition)
```

### 4. React Delegated Hydration

**Handling Prepaint DOM / React VDOM Mismatches**

```tsx
// 80% case: React reuses DOM
// 20% case: React auto patches
// Smooth transition via ViewTransition
```

---

## 📊 Performance Targets

| Metric                    | Target        | Current        |
| ------------------------- | ------------- | -------------- |
| **BlankScreenTime (BST)** | 0ms (revisit) | ⏳ In Progress |
| **PrepaintTime (PPT)**    | <20ms         | ⏳ In Progress |
| **HydrationSuccess**      | >80%          | ⏳ In Progress |
| **ViewTransitionSmooth**  | >90%          | ✅ 95%         |
| **BootScriptSize**        | <2KB gzip     | ⏳ Target      |
| **ReactSyncLatency**      | <50ms         | ✅ 42ms        |
| **TxRollbackTime**        | <100ms        | ✅ 85ms        |

---

## 🗺️ Roadmap

### v0.1.0 (MVP - Current)

**Completed:**

- ✅ Local-First (IndexedDB + React integration)
- ✅ Tx (optimistic updates + atomic rollback)

**In Progress:**

- ⏳ Prepaint (Instant Replay)
  - ✅ handoff, capture, createFirstTxRoot
  - ⏳ boot script
  - ⏳ Vite plugin

### v0.2.0 (Phase 1)

- BroadcastChannel multi-tab sync
- visibilitychange capture
- Router integration (React Router, TanStack Router)
- Tx journal persistence

### v1.0.0 (Production Ready)

- Complete Vite/Next.js plugins
- Full E2E test coverage
- DevTools integration
- Performance optimization
- Complete documentation

---

## 🎨 Demo

[Live Demo →](https://firsttx-demo.vercel.app/)

**Key Demo Scenarios:**

1. **Revisit After a Week** - TTL visualization
2. **Offline Shopping** - Network disconnect simulation
3. **Optimistic Update Failure** - Rollback animation
4. **Concurrent Actions** - Transaction consistency

---

## Development Setup

```bash
# Clone repository
git clone https://github.com/joseph0926/firsttx.git
cd firsttx

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test
```

---

## 📄 License

MIT © [joseph0926](https://github.com/joseph0926)

---

## 🔗 Links

- Developer Email: joseph0926.dev@gmail.com
- [GitHub Issues](https://github.com/joseph0926/firsttx/issues)

---

## 💬 FAQ

<details>
<summary><strong>Q: How is this different from SSR/RSC?</strong></summary>

**A:** FirstTx is a solution for CSR apps.

| Solution          | First Visit | Revisit | Server Required |
| ----------------- | ----------- | ------- | --------------- |
| SSR/RSC           | ⚡ Fast     | ⚡ Fast | ✅ Required     |
| CSR (Traditional) | 🐌 Slow     | 🐌 Slow | ❌ Optional     |
| **FirstTx**       | 🐌 Normal   | ⚡ Fast | ❌ Optional     |

FirstTx brings SSR-level revisit experience without server infrastructure.

</details>

<details>
<summary><strong>Q: Can I use this with React Query/SWR?</strong></summary>

**A:** Yes! FirstTx works alongside existing data fetching libraries.

- **Local-First**: Persistent storage (IndexedDB)
- **React Query**: Network cache + retry
- **Tx**: Optimistic update rollback

Each layer operates independently—use only what you need.

</details>

<details>
<summary><strong>Q: Browser compatibility?</strong></summary>

**A:**

- **IndexedDB**: IE11+ (all modern browsers)
- **ViewTransition**: Chrome 111+ (fallback provided)
- **useSyncExternalStore**: React 18+

Browsers without ViewTransition support fall back to regular re-renders.

</details>

<details>
<summary><strong>Q: Is it safe to store sensitive data (PII)?</strong></summary>

**A:** FirstTx does not provide encryption.

- IndexedDB is protected by same-origin policy
- Encrypt sensitive data before storage (recommended)
- Or use memory-only models (ttl: 0)

</details>
