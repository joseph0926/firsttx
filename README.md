<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 확인해주세요.

**Making CSR App Revisits Feel Like SSR**

From the second visit onward, instantly restore the last state and safely roll back optimistic updates—delivering fast, consistent experiences without extra server infrastructure.

---

## Table of Contents

- [Core Value](#core-value)
- [Quick Start](#quick-start)
- [Overlay Mode (Safe Prepaint)](#overlay-mode-safe-prepaint)
- [Architecture](#architecture)
- [Packages](#packages)
- [Key Features](#key-features)
- [Vite Plugin (Advanced)](#vite-plugin-advanced)
- [TypeScript & Globals](#typescript--globals)
- [Router Integration Notes](#router-integration-notes)
- [Performance Targets](#performance-targets)
- [Design Philosophy](#design-philosophy)
- [Browser Support](#browser-support)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)
- [License](#license)
- [Links](#links)

---

## Core Value

### The Problem: CSR Revisit Experience

```
Every visit: blank screen → API wait → data display
Refresh loses progress
Optimistic update failures cause partial rollback inconsistencies
Server synchronization boilerplate cluttering components
```

### The Solution: FirstTx = Prepaint + Local-First + Tx

```
[Revisit Scenario]
1. Revisit /cart → instantly show yesterday’s 3 items (~0ms)
2. Main app loads → React hydration → reuse snapshot DOM
3. Server sync → smooth update via ViewTransition (3 → 5 items)
4. “+1” click → Tx starts → optimistic patch → server error
5. Auto rollback → smooth return to original state via ViewTransition
```

**Results**

- Blank screen time on revisit ≈ 0ms
- Smooth animations when transitioning from snapshot to fresh data
- Consistent atomic rollback on optimistic update failures
- ~90% reduction in server sync boilerplate
- Last state persists even offline

---

## Quick Start

### Installation

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### Basic Setup

#### 1) Vite Plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx(), // Injects the boot script that restores snapshots ASAP
  ],
});
```

#### 2) Define a Model

```ts
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

#### 3) Main Entry

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

#### 4) Local-only Usage

```tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart-model';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);
  if (!cart) return <Skeleton />;
  return (
    <div>
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

#### 5) With Server Sync

```tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart-model';

async function fetchCart() {
  const res = await fetch('/api/cart');
  return res.json();
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
    autoSync: true, // Sync when stale/TTL exceeded
    onSuccess: (d) => console.log('Synced:', d),
    onError: (e) => console.error(e),
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

**autoSync strategies**

| Strategy                    | When to use             | Examples                                |
| --------------------------- | ----------------------- | --------------------------------------- |
| `autoSync: true`            | Data must stay fresh    | Stock prices, notifications, dashboards |
| `autoSync: false` (default) | User-controlled refresh | Carts, drafts, forms                    |

```tsx
// Manual sync (autoSync: false)
const { data, sync, isSyncing } = useSyncedModel(Model, fetcher);
<button onClick={sync} disabled={isSyncing}>
  {isSyncing ? 'Syncing…' : 'Refresh'}
</button>;
```

#### 6) Optimistic Updates with Tx

```ts
import { startTransaction } from '@firsttx/tx';
import { CartModel } from './models/cart-model';

async function addItem(product) {
  const tx = startTransaction({ transition: true });

  await tx.run(
    () =>
      CartModel.patch((d) => {
        d.items.push({ ...product, qty: 1 });
      }),
    {
      compensate: () =>
        CartModel.patch((d) => {
          d.items.pop();
        }),
    },
  );

  await tx.run(() => api.post('/cart/add', { id: product.id }));

  await tx.commit();
}
```

---

## Overlay Mode (Safe Prepaint)

Some client routers and third‑party code may temporarily inject or reorder root-level nodes during startup. If a snapshot is directly injected into `#root` in these cases, you might see **duplicate UI** on refresh. To avoid this, FirstTx provides **Overlay Mode**

- The snapshot is rendered in a **fixed, pointer‑events:none** overlay using **Shadow DOM**.
- Your app hydrates underneath without touching the overlay.
- Once hydration stabilizes, FirstTx removes the overlay and any prepaint styles.
- Result: instant visual feedback with no double rendering risk.

**Enable Overlay**

You can enable it globally, per route, or at runtime

1. **Vite plugin option** (recommended)

```ts
firstTx({
  overlay: true, // enable for all routes
  overlayRoutes: ['/prepaint/'], // or only for specific prefixes
});
```

2. **LocalStorage toggles** (no rebuild)

```js
localStorage.setItem('firsttx:overlay', '1');
// or prefix list
localStorage.setItem('firsttx:overlayRoutes', '/prepaint/,/cart/');
```

3. **Runtime global**

```html
<script>
  window.__FIRSTTX_OVERLAY__ = true;
</script>
```

**Mark Volatile Regions (optional)**
If a sub-tree often changes between visits (timestamps, counters), mark it to be blanked in snapshots

```html
<span data-firsttx-volatile>42 notifications</span>
```

The snapshot will capture the structure but clear the text, reducing hydration mismatch risk.

---

## Architecture

### Three-Layer System

```
┌──────────────────────────────────────────┐
│   Render Layer (Prepaint)                │
│   - Instant Replay                       │
│   - beforeunload / pagehide capture      │
│   - Overlay + Hydration guard            │
└──────────────────────────────────────────┘
                     ↓ read
┌──────────────────────────────────────────┐
│   Local-First (Data Layer)               │
│   - IndexedDB snapshot/model management  │
│   - React integration (useSyncExtStore)  │
│   - Memory cache pattern                 │
│   - useSyncedModel (server sync)         │
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
[Boot - ~0ms]
HTML load → Prepaint boot → read snapshot → render (overlay or direct)

[Handoff]
createFirstTxRoot() → hydration under overlay or reusing injected DOM
→ hydration guard ensures single root → prepaint cleanup

[Sync]
useSyncedModel → staleness detection → fetcher()
→ optional ViewTransition → minimal re-render

[Interaction]
Tx → optimistic patch → server call
→ success: commit / failure: auto rollback with ViewTransition
```

---

## Packages

### [`@firsttx/prepaint`](./packages/prepaint)

Render layer – instant replay system

- `boot()` – Boot script (IndexedDB → DOM)
- `createFirstTxRoot()` – React helper with hydration guard and cleanup
- `handoff()` – Decide `'has-prepaint' | 'cold-start'`
- `setupCapture()` – Capture on `beforeunload`, `pagehide`, `visibilitychange`
- Overlay rendering via Shadow DOM

### [`@firsttx/local-first`](./packages/local-first)

Data layer – IndexedDB + React

- `defineModel()` / `useModel()` / `useSyncedModel()`
- Memory cache bridge (`useSyncExternalStore`)
- TTL, version, history metadata

### [`@firsttx/tx`](./packages/tx)

Execution layer – optimistic + atomic

- `startTransaction()` → `tx.run()` → `tx.commit()`
- Compensation handlers, built-in retry
- ViewTransition integration

---

## Key Features

1. **Instant Replay** (~0ms perceived)
2. **Safe Hydration** (overlay + guard)
3. **Server Sync** (boilerplate-free)
4. **Atomic Rollback** (Tx)
5. **Smooth Transitions** (ViewTransition)
6. **Local-First** (works offline, sync when needed)

---

## Vite Plugin (Advanced)

```ts
export interface FirstTxPluginOptions {
  inline?: boolean; // default: true
  minify?: boolean; // default: !dev
  injectTo?: 'head' | 'head-prepend' | 'body' | 'body-prepend'; // default: 'head-prepend'
  nonce?: string | (() => string); // CSP nonce support
  overlay?: boolean; // default: undefined (off)
  overlayRoutes?: string[]; // e.g. ['/prepaint/','/cart']
  devFlagOverride?: boolean; // force dev/production define
}
```

**Examples**

Enable overlay for selected areas and set CSP nonce

```ts
firstTx({
  overlayRoutes: ['/prepaint/'],
  nonce: () => process.env.CSP_NONCE ?? '',
});
```

---

## TypeScript & Globals

The Prepaint package provides globals via `define` during build

- `__FIRSTTX_DEV__` – `boolean` set by the plugin (no need to reference `import.meta.env.DEV` inside the library).
- `window.__FIRSTTX_OVERLAY__?: boolean` – optional runtime switch to force overlay.

If your app’s TS setup needs explicit declarations (e.g., strict monorepo settings), add

```ts
// src/types/firsttx-globals.d.ts
declare const __FIRSTTX_DEV__: boolean;
declare global {
  interface Window {
    __FIRSTTX_OVERLAY__?: boolean;
  }
}
export {};
```

---

## Router Integration Notes

- **React Router (v7+)**: If you see a hydration warning about missing fallback, pass a fallback element

```tsx
import { RouterProvider } from 'react-router-dom';
<RouterProvider router={router} hydrateFallbackElement={<div />} />;
```

- Overlay mode is recommended for complex route shells or when nested roots/portals may appear before hydration completes.

---

## Performance Targets

| Metric                   | Target | Status     |
| ------------------------ | ------ | ---------- |
| BlankScreenTime (BST)    | ~0ms   | ✅ ~0ms    |
| PrepaintTime (PPT)       | <20ms  | ✅ ~15ms   |
| HydrationSuccess         | >80%   | ✅ ~82%    |
| ViewTransitionSmooth     | >90%   | ✅ ~95%    |
| BootScriptSize           | <2KB   | ✅ ~1.74KB |
| ReactSyncLatency         | <50ms  | ✅ ~42ms   |
| TxRollbackTime           | <100ms | ✅ ~85ms   |
| SyncBoilerplateReduction | >90%   | ✅ ~90%    |

---

## Design Philosophy

**Best fit**

- Internal tools (CRM, dashboards, admin)
- Frequent revisits (10+ per day)
- No SEO requirement (behind login)
- Complex interactive UIs
- Minimal server infra

**Not ideal**

- Public marketing sites (SSR/SSG)
- First-visit is the top priority
- “Always fresh” data requirements
- Very simple CRUD apps

Trade-offs vs SSR/RSC

| Aspect            | FirstTx              | SSR/RSC      |
| ----------------- | -------------------- | ------------ |
| First visit       | CSR (slower)         | Fast         |
| Revisit           | ~0ms (instant)       | Fast         |
| Data freshness    | Snapshot → Sync      | Always fresh |
| Server complexity | Minimal (APIs only)  | Required     |
| SEO               | Not targeted         | Full support |
| Offline           | Preserves last state | No           |

---

## Troubleshooting

**Duplicate UI after refresh**
Use **Overlay Mode**. It renders the snapshot above your app in a Shadow DOM and is removed after hydration, eliminating multiple-root issues caused by routers or early DOM mutations.

**Hydration mismatch due to changing text**
Mark changing segments with `data-firsttx-volatile`. They’ll be blanked in snapshots, reducing mismatch risk.

**TypeScript error: `import.meta.env`**
Inside FirstTx we rely on `__FIRSTTX_DEV__` injected by the plugin, not `import.meta.env`. Apps do not need to set this manually. If your TS complains about the globals, add the small `d.ts` from the [TypeScript & Globals](#typescript--globals) section.

**CSP**
Set `nonce` in the plugin options so the auto‑injected boot script passes CSP.

---

## Examples

- [`apps/demo`](./apps/demo) — Simple cart demo
- [`apps/playground`](./apps/playground) — Interactive scenarios (Prepaint, Sync, Tx)

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Links

- Repo: [https://github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- Email: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)
