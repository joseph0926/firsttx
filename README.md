<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 확인해주세요.

**Eliminate blank screens on revisits - Restore last state instantly**

## Demo

### Prepaint

<table>
<tr>
<td align="center">❌ Before prepaint</td>
<td align="center">✅ After prepaint</td>
</tr>
<tr>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-01_vi2svy.gif" /></td>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-02_tfmsy7.gif" /></td>
</tr>
<tr>
<td align="center"><sub>Slow 4G: Blank screen exposed</sub></td>
<td align="center"><sub>Slow 4G: Instant restore</sub></td>
</tr>
</table>

### TX

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400068/firsttx-tx-01_blkctj.gif" />

### Local First

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400559/firsttx-local-01_zwhtge.gif" />

## Is FirstTx for you?

Have you experienced any of these?

- Users complaining "loading is too slow"
- Developing internal tools with frequent revisits
- Losing work progress on refresh
- Want SSR benefits while keeping CSR architecture

→ If any apply, FirstTx can help

## Installation

**For most cases (recommended)**

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

<details>
<summary>For specific features only</summary>

**Revisit optimization only**

```bash
pnpm add @firsttx/prepaint
```

**Revisit + Data synchronization**

```bash
pnpm add @firsttx/prepaint @firsttx/local-first
```

**Data synchronization + Optimistic updates**

```bash
pnpm add @firsttx/local-first @firsttx/tx
```

> ⚠️ **Dependency** Tx requires Local-First.

</details>

## Quick Start

### 1. Vite Plugin Setup

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx()],
});
```

<details>
<summary>How does it work?</summary>

The Vite plugin automatically injects a boot script into HTML. This script instantly restores the saved screen from IndexedDB on page load.

</details>

### 2. Entry Point Setup

```ts
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

<details>
<summary>How does it work?</summary>

`createFirstTxRoot`:

1. Saves the screen to IndexedDB when leaving the page
2. Restores instantly before React loads on revisit
3. Mounts the actual app via Hydration or Client Render

</details>

### 3. Define Data Model

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
        qty: z.number(),
      }),
    ),
  }),
  ttl: 5 * 60 * 1000,
});
```

### 4. Use in Component

```tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const { data: cart } = useSyncedModel(CartModel, () => fetch('/api/cart').then((r) => r.json()));

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

### 5. Optimistic Updates (Optional)

```ts
import { startTransaction } from '@firsttx/tx';

async function addToCart(item) {
  const tx = startTransaction();

  await tx.run(
    () =>
      CartModel.patch((draft) => {
        draft.items.push(item);
      }),
    {
      compensate: () =>
        CartModel.patch((draft) => {
          draft.items.pop();
        }),
    },
  );

  await tx.run(() =>
    fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  );

  await tx.commit();
}
```

<details>
<summary>How does it work?</summary>

Transactions bundle multiple steps into one atomic operation. If the server request fails, the `compensate` function automatically executes to revert local changes.

</details>

## Examples

Experience FirstTx with working examples

### Interactive Playground

Test each feature with 9 different scenarios

**[Open Playground](https://firsttx-playground.vercel.app)**<br/>
**[Playground Code](https://github.com/joseph0926/firsttx/tree/main/apps/playground)**

- Prepaint: Instant restore / Router integration
- Sync: Conflict resolution / Timing attacks / Staleness
- Tx: Concurrent updates / Rollback chains / Network chaos

---

💡 **Curious about API options?** → Jump to [API Reference](#api-reference)

## API Reference

### Prepaint

#### `createFirstTxRoot(container, element, options?)`

Creates React entry point and sets up Prepaint capture.

```tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />, { transition: true });
```

**Parameters**

- `container: HTMLElement` - DOM element to mount to
- `element: ReactElement` - React element to render
- `options?: { transition?: boolean }` - Whether to use ViewTransition (default: `true`)

---

### Local-First

#### `defineModel(key, options)`

Defines an IndexedDB model.

```tsx
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const CartModel = defineModel('cart', {
  schema: z.object({ items: z.array(...) }),
  ttl: 5 * 60 * 1000,
});
```

**Parameters**

- `key: string` - IndexedDB key (must be unique)
- `options.schema: ZodSchema` - Zod schema
- `options.ttl?: number` - Time-to-live in milliseconds (default: unlimited)

#### `useSyncedModel(model, fetcher, options?)`

Automatically syncs model with server.

```tsx
const { data, patch, sync, isSyncing, error, history } = useSyncedModel(CartModel, fetchCart, {
  syncOnMount: 'stale',
  onSuccess: (data) => console.log('Synced'),
  onError: (err) => console.error(err),
});
```

**Parameters**

- `model: Model<T>` - Model created with defineModel
- `fetcher: () => Promise<T>` - Function to fetch server data
- `options?: SyncOptions`

**SyncOptions**

- `syncOnMount?: 'always' | 'stale' | 'never'` (default: `'stale'`)
  - `'always'`: Always sync on mount
  - `'stale'`: Only sync when TTL exceeded
  - `'never'`: Manual sync only
- `onSuccess?: (data: T) => void`
- `onError?: (error: Error) => void`

**Returns**

- `data: T | null` - Current data
- `patch: (fn: (draft: T) => void) => Promise<void>` - Local update
- `sync: () => Promise<void>` - Manual sync
- `isSyncing: boolean` - Whether syncing
- `error: Error | null` - Sync error
- `history: ModelHistory` - Metadata
  - `age: number` - Time elapsed since last update (ms)
  - `isStale: boolean` - Whether TTL exceeded
  - `updatedAt: number` - Last update timestamp

#### Cross-Tab Synchronization

Automatically synchronizes model changes across all open tabs using BroadcastChannel API.

- ~1ms sync latency between tabs
- Zero network overhead (browser-internal)
- Automatic consistency across all tabs
- Graceful degradation for older browsers (97%+ support)

---

### Tx

#### `startTransaction(options?)`

Starts an atomic transaction.

```tsx
import { startTransaction } from '@firsttx/tx';

const tx = startTransaction({ transition: true });

await tx.run(
  () =>
    CartModel.patch((draft) => {
      /* update */
    }),
  {
    compensate: () =>
      CartModel.patch((draft) => {
        /* rollback */
      }),
    retry: { maxAttempts: 1 },
  },
);

await tx.commit();
```

#### `useTx(config)`

React hook for simplified transaction management.

```tsx
import { useTx } from '@firsttx/tx';

const { mutate, isPending, isError, error } = useTx({
  optimistic: async (item) => {
    await CartModel.patch((draft) => draft.items.push(item));
  },
  rollback: async (item) => {
    await CartModel.patch((draft) => draft.items.pop());
  },
  request: async (item) =>
    fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  onSuccess: () => toast.success('Done!'),
});

// Usage
<button onClick={() => mutate(newItem)} disabled={isPending}>
  {isPending ? 'Adding...' : 'Add to Cart'}
</button>;
```

**Parameters**

- `config.optimistic` - Local state update function
- `config.rollback` - Rollback function
- `config.request` - Server request function
- `config.transition?` - Use ViewTransition (default: `true`)
- `config.retry?` - Retry config `{ maxAttempts, delayMs, backoff }`
- `config.onSuccess?` - Success callback
- `config.onError?` - Error callback

**Returns**

- `mutate(variables)` - Execute transaction
- `isPending`, `isError`, `isSuccess` - State flags
- `error` - Error object

---

💡 **Need practical examples?** → Return to [Examples](#examples)

## Features

### Prepaint - Revisit 0ms

Automatically saves screen to IndexedDB when leaving page, and instantly restores before React loads on revisit.

**Core Technology**

- Inline boot script (<2KB)
- ViewTransition integration
- Automatic hydration fallback

**Performance**

- Blank Screen Time: ~0ms
- Prepaint Time: <20ms
- Hydration Success: >80%

---

### Local-First - Auto Sync

Connects IndexedDB and React via useSyncExternalStore to guarantee synchronous state reads.

**Core Features**

- TTL-based auto expiration
- Stale detection and auto refetch
- Zod schema validation
- Version management

**DX Improvements**

- ~90% reduction in sync boilerplate
- React Sync Latency: <50ms

---

### Tx - Atomic Rollback

Bundles optimistic updates and server requests into one transaction, with automatic rollback on failure.

**Core Features**

- Compensation-based rollback (reverse execution)
- Retry strategies (linear/exponential backoff)
- ViewTransition integration

**Reliability**

- Rollback Time: <100ms
- ViewTransition Smooth: >90%

---

## Browser Support

| Browser     | Min Version | ViewTransition   | Status                  |
| ----------- | ----------- | ---------------- | ----------------------- |
| Chrome/Edge | 111+        | ✅ Full support  | ✅ Tested               |
| Firefox     | Latest      | ❌ Not supported | ✅ Graceful degradation |
| Safari      | 16+         | ❌ Not supported | ✅ Graceful degradation |

> Core features work everywhere even without ViewTransition.

---

## When to Use

✅ **Choose FirstTx**

- Internal tools (CRM, dashboards, admin panels)
- Apps with frequent revisits (10+ times/day)
- Apps without SEO requirements
- Complex client-side interactions

❌ **Consider alternatives**

- Public landing/marketing sites → SSR/SSG
- First-visit performance is critical → SSR
- Always need latest data → Server-driven UI

---

## Troubleshooting

**Q: UI duplicates on refresh**
A: Enable `overlay: true` option in Vite plugin.

**Q: Hydration warnings occur**
A: Add `data-firsttx-volatile` attribute to frequently changing elements.

**Q: TypeScript errors**
A: Add global declaration: `declare const __FIRSTTX_DEV__: boolean`

Find more solutions at [GitHub Issues](https://github.com/joseph0926/firsttx/issues).

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Links

- [GitHub Repository](https://github.com/joseph0926/firsttx)
- [Issues](https://github.com/joseph0926/firsttx/issues)
- Email: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)
