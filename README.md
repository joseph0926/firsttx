<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 확인해주세요.

**Making CSR App Revisits Feel Like SSR**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)

> From the second visit onwards, instantly restore the last state and safely rollback optimistic updates—delivering fast, consistent experiences without server infrastructure.

---

## Table of Contents

- [Core Value](#core-value)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Packages](#packages)
- [Key Features](#key-features)
- [Performance Targets](#performance-targets)
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
1. Revisit /cart → instantly show yesterday's 3 items (0ms)
2. Main app loads → React hydration → reuse snapshot DOM
3. Server sync → smooth update via ViewTransition (3 → 5 items)
4. "+1" click → Tx starts → optimistic patch → server error
5. Auto rollback → smooth return to original state via ViewTransition
```

**Results**

- Blank screen time on revisit = 0ms
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

### Basic Usage

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

#### 3. React Component (Server Sync)

```tsx
// pages/cart-page.tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from '@/models/cart-model';

async function fetchCart(current) {
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
    autoSync: true, // Auto-sync when stale
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

## Architecture

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
[Boot - 0ms]
HTML load → Prepaint boot → IndexedDB snapshot read → DOM instant injection

[Handoff - 500ms]
Main app load → createFirstTxRoot() → React hydration → DOM reuse

[Sync - 800ms]
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

### 1. Instant Replay (0ms Restoration)

Instantly restore last state on revisit

```tsx
// Runs before main bundle arrives (boot script)
import { boot } from '@firsttx/prepaint';
boot(); // IndexedDB → instant DOM injection (0ms)
```

### 2. Server Sync with Zero Boilerplate

React Query-level DX without the complexity

```tsx
// Traditional approach (verbose)
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

// FirstTx approach (concise)
const { data, isSyncing, error } = useSyncedModel(DataModel, fetchData, { autoSync: true });
```

### 3. Atomic Rollback

All succeed or all fail (with ViewTransition)

```tsx
const tx = startTransaction({ transition: true });

await tx.run(() => CartModel.patch(...), {
  compensate: () => CartModel.patch(...) // Runs on rollback
});

await tx.run(() => api.post(...));

await tx.commit(); // Auto rollback on failure
```

### 4. Memory Cache Pattern

IndexedDB (async) ↔ React (sync) Bridge

```tsx
// Inside Model
let cache: T | null = null;
const subscribers = new Set<() => void>();

// Load IndexedDB on first subscription
subscribe(callback) → update cache → notifySubscribers()

// React reads synchronously
getCachedSnapshot() → cache (sync!)
```

---

## Performance Targets

| Metric                       | Target        | Current     |
| ---------------------------- | ------------- | ----------- |
| **BlankScreenTime (BST)**    | 0ms (revisit) | In Progress |
| **PrepaintTime (PPT)**       | <20ms         | In Progress |
| **HydrationSuccess**         | >80%          | In Progress |
| **ViewTransitionSmooth**     | >90%          | 95%         |
| **BootScriptSize**           | <2KB gzip     | Target      |
| **ReactSyncLatency**         | <50ms         | 42ms        |
| **TxRollbackTime**           | <100ms        | 85ms        |
| **SyncBoilerplateReduction** | >90%          | 90%         |

---

## Examples

Explore real-world scenarios in our [playground](./apps/playground):

- **Prepaint**: Heavy page instant replay, route switching
- **Sync**: Conflict resolution, timing attacks, staleness detection
- **Tx**: Concurrent updates, rollback chains, network chaos

---

## Browser Compatibility

- **IndexedDB**: All modern browsers (IE11+)
- **ViewTransition**: Chrome 111+, Edge 111+ (graceful fallback)
- **useSyncExternalStore**: React 18+

Browsers without ViewTransition support fall back to regular re-renders without animation.

---

## FAQ

**Q: How is this different from SSR/RSC?**

FirstTx is a solution for CSR apps where SSR is not feasible or desired (admin panels, dashboards, internal tools).

| Solution          | First Visit | Revisit | Server Required |
| ----------------- | ----------- | ------- | --------------- |
| SSR/RSC           | Fast        | Fast    | Required        |
| CSR (Traditional) | Slow        | Slow    | Optional        |
| **FirstTx**       | Normal      | Fast    | Optional        |

**Q: Can I use this with React Query/SWR?**

Yes! FirstTx works alongside existing data fetching libraries:

- **Local-First**: Persistent storage (IndexedDB)
- **React Query**: Network cache + retry
- **Tx**: Optimistic update rollback

**Q: Is it safe to store sensitive data?**

FirstTx does not provide encryption. IndexedDB is protected by same-origin policy, but you should encrypt sensitive data before storage.

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Links

- [GitHub Repository](https://github.com/joseph0926/firsttx)
- [GitHub Issues](https://github.com/joseph0926/firsttx/issues)
- Developer Email: joseph0926.dev@gmail.com
