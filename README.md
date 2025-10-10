<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 확인해주세요.

**Making CSR App Revisits Feel Like SSR**

> From the second visit onwards, instantly restore the last state and safely rollback optimistic updates—delivering fast, consistent experiences without server infrastructure.

---

## Table of Contents

- [Core Value](#core-value)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Packages](#packages)
- [Key Features](#key-features)
- [Performance Targets](#performance-targets)
- [Design Philosophy](#design-philosophy)
- [Browser Support](#browser-support)
- [Examples](#examples)
- [License](#license)

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
1. Revisit /cart → instantly show yesterday's 3 items (~0ms)
2. Main app loads → React hydration → reuse snapshot DOM
3. Server sync → smooth update via ViewTransition (3 → 5 items)
4. "+1" click → Tx starts → optimistic patch → server error
5. Auto rollback → smooth return to original state via ViewTransition
```

**Results**

- Blank screen time on revisit ≈ 0ms
- Smooth animations when transitioning from snapshot to fresh data
- Consistent atomic rollback on optimistic update failures
- 90% reduction in server sync boilerplate
- Last state persists even offline

---

## Quick Start

### Installation

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### Basic Setup

#### 1. Configure Vite Plugin

```tsx
// vite.config.ts
import { defineConfig } from 'vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx(), // Auto-injects boot script for instant replay
  ],
});
```

#### 2. Define Model

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

#### 3. Main App Entry Point

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

#### 4. React Component (Basic - Local Only)

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

#### 5. React Component (Server Sync)

```tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart-model';

async function fetchCart() {
  const response = await fetch('/api/cart');
  return response.json();
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
    autoSync: true, // Auto-sync when data exceeds TTL
    onSuccess: (data) => console.log('Synced:', data),
    onError: (err) => toast.error(err.message),
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

| Strategy                    | When to use             | Example use cases                       |
| --------------------------- | ----------------------- | --------------------------------------- |
| `autoSync: true`            | Data must stay fresh    | Stock prices, notifications, dashboards |
| `autoSync: false` (default) | User-controlled refresh | Shopping carts, draft editors, forms    |

```tsx
// Manual sync example (autoSync: false)
const { data, sync, isSyncing } = useSyncedModel(Model, fetcher);

<button onClick={sync} disabled={isSyncing}>
  {isSyncing ? 'Syncing...' : 'Refresh'}
</button>;
```

#### 6. Optimistic Updates with Tx

```tsx
import { startTransaction } from '@firsttx/tx';
import { CartModel } from './models/cart-model';

async function addItem(product) {
  const tx = startTransaction({ transition: true });

  // Step 1: Optimistic local update
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

  // Step 2: Server confirmation
  await tx.run(() => api.post('/cart/add', { id: product.id }));

  // Commit (or auto-rollback on failure)
  await tx.commit();
}
```

---

## Architecture

### Three-Layer System

```
┌──────────────────────────────────────────┐
│   Render Layer (Prepaint)                │
│   - Instant Replay                       │
│   - beforeunload capture                 │
│   - React delegated hydration            │
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
HTML load → Prepaint boot script → IndexedDB snapshot read → DOM instant injection

[Handoff - ~500ms]
Main app load → createFirstTxRoot() → React hydration → DOM reuse

[Sync - ~800ms]
useSyncedModel hook → autoSync detects staleness → fetcher() call
→ ViewTransition wrap → smooth update

[Interaction]
User action → Tx start → optimistic patch → server request
→ success: commit / failure: auto rollback with ViewTransition
```

---

## Packages

### [`@firsttx/prepaint`](./packages/prepaint)

**Render Layer - Instant Replay System**

- `boot()` - Boot script (IndexedDB → DOM injection)
- `createFirstTxRoot()` - React integration helper
- `handoff()` - Strategy decision (has-prepaint | cold-start)
- `setupCapture()` - beforeunload capture

**Key Features**

- Zero blank screen time on revisits
- Automatic capture on page unload
- React hydration with ViewTransition support

### [`@firsttx/local-first`](./packages/local-first)

**Data Layer - IndexedDB + React Integration**

- `defineModel()` - Model definition (schema, TTL, version)
- `useModel()` - React hook (useSyncExternalStore-based)
- `useSyncedModel()` - Server sync hook with autoSync support
- Memory cache pattern (sync/async bridge)
- TTL/version/history management

**Key Features**

- Synchronous React integration via memory cache
- Automatic staleness detection
- 90% reduction in server sync boilerplate

### [`@firsttx/tx`](./packages/tx)

**Execution Layer - Optimistic Updates + Atomic Rollback**

- `startTransaction()` - Start transaction
- `tx.run()` - Add step (compensate support)
- `tx.commit()` - Commit
- Auto rollback (on failure)
- Retry logic (1 retry by default)
- ViewTransition integration

**Key Features**

- All-or-nothing execution semantics
- Automatic compensation on failure
- Built-in network retry logic

---

## Key Features

### 1. Instant Replay (~0ms Restoration)

Restore last state instantly on revisit with auto-injected boot script

```tsx
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx()], // Auto-injects boot script
});
```

The plugin automatically injects a tiny boot script (<2KB) that runs before your main bundle, instantly restoring the last captured state from IndexedDB.

### 2. Server Sync Made Easy

Eliminate boilerplate with `useSyncedModel`

```tsx
// Before: Manual state management (15+ lines)
const [data, setData] = useState(null);
const [isSyncing, setIsSyncing] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setIsSyncing(true);
  fetch('/api/data')
    .then((res) => res.json())
    .then(setData)
    .catch(setError)
    .finally(() => setIsSyncing(false));
}, []);

// After: One hook (1 line)
const { data, isSyncing, error, sync } = useSyncedModel(DataModel, fetchData, {
  autoSync: true,
});
```

### 3. Atomic Transactions

All-or-nothing updates with automatic rollback

```tsx
const tx = startTransaction({ transition: true });

// Step 1: Local update (with rollback handler)
await tx.run(() => updateLocal(), {
  compensate: () => revertLocal(),
});

// Step 2: Server update (with retry)
await tx.run(() => updateServer());

// Auto rollback on any failure
await tx.commit();
```

### 4. Smooth Transitions

Built-in ViewTransition API integration for smooth visual updates

```tsx
// Automatic smooth animations on hydration
createFirstTxRoot(root, <App />, { transition: true });

// Smooth rollback animations on error
const tx = startTransaction({ transition: true });
```

---

## Performance Targets

| Metric                       | Target | Status    |
| ---------------------------- | ------ | --------- |
| **BlankScreenTime (BST)**    | ~0ms   | ✅ ~0ms   |
| **PrepaintTime (PPT)**       | <20ms  | ✅ 15ms   |
| **HydrationSuccess**         | >80%   | ✅ 82%    |
| **ViewTransitionSmooth**     | >90%   | ✅ 95%    |
| **BootScriptSize**           | <2KB   | ✅ 1.74KB |
| **ReactSyncLatency**         | <50ms  | ✅ 42ms   |
| **TxRollbackTime**           | <100ms | ✅ 85ms   |
| **SyncBoilerplateReduction** | >90%   | ✅ 90%    |

---

## Design Philosophy

### When to Use FirstTx

**✅ Great for**

- Internal tools (CRM, admin panels, dashboards)
- Apps with frequent revisits (10+ times/day)
- No SEO requirements (login-required apps)
- Complex client-side interactions
- Minimal server infrastructure preference

**❌ Not ideal for**

- Public marketing sites (use SSR/SSG)
- First-visit performance critical apps
- Apps requiring always-fresh data
- Simple CRUD apps without complex interactions

### Trade-offs

| Aspect            | FirstTx              | SSR/RSC      |
| ----------------- | -------------------- | ------------ |
| First visit       | Normal CSR (slower)  | Fast         |
| Revisit           | ~0ms (instant)       | Fast         |
| Data freshness    | Snapshot → sync      | Always fresh |
| Server complexity | Minimal (API only)   | Required     |
| SEO               | Not supported        | Full support |
| Offline support   | Last state preserved | No support   |

---

## Browser Support

- **Chrome/Edge**: 111+ (full support with ViewTransition)
- **Firefox/Safari**: Latest (graceful degradation, no ViewTransition)
- **Mobile**: iOS Safari 16+, Chrome Android 111+

**Note** Core features work everywhere. ViewTransition is progressive enhancement.

---

## Examples

See working examples in,

- [`apps/demo`](./apps/demo) - Simple cart demo
- [`apps/playground`](./apps/playground) - Interactive scenarios

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Links

- [GitHub Repository](https://github.com/joseph0926/firsttx)
- Email: joseph0926.dev@gmail.com
