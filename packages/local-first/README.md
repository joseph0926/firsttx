# @firsttx/local-first

**Bridge IndexedDB (async) and React state (sync) seamlessly.**

Type-safe IndexedDB models with React integration via `useSyncExternalStore`. Eliminates 90% of server sync boilerplate. Works with `@firsttx/tx` for atomic optimistic updates.

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400559/firsttx-local-01_zwhtge.gif" />

```bash
npm install @firsttx/local-first zod
```

[![npm version](https://img.shields.io/npm/v/@firsttx/local-first.svg)](https://www.npmjs.com/package/@firsttx/local-first)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Basic Usage

### 1. Define a Model

```ts
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
    total: z.number(),
  }),
  ttl: 5 * 60 * 1000, // optional - defaults to 5 minutes
  initialData: { items: [], total: 0 },
});
```

### 2. Use in React (Local-Only)

```tsx
import { useModel } from '@firsttx/local-first';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <Skeleton />;

  return (
    <div>
      {history.isStale && <Badge>Stale ({Math.floor(history.age / 1000)}s old)</Badge>}
      <h1>Cart ({cart.items.length} items)</h1>
      <button
        onClick={() =>
          patch((draft) => {
            draft.items.push({ id: '1', name: 'Product', price: 100, qty: 1 });
            draft.total += 100;
          })
        }
      >
        Add Item
      </button>
    </div>
  );
}
```

### 3. Sync with Server (Auto)

```tsx
import { useSyncedModel } from '@firsttx/local-first';

function CartPage() {
  const {
    data: cart,
    patch,
    sync,
    isSyncing,
    error,
  } = useSyncedModel(
    CartModel,
    async () => {
      const res = await fetch('/api/cart');
      return res.json();
    },
    {
      syncOnMount: 'stale', // auto-sync when stale (default)
      onSuccess: () => toast.success('Synced'),
      onError: (err) => toast.error(err.message),
    },
  );

  if (!cart) return <Skeleton />;

  return (
    <div>
      {isSyncing && <Spinner />}
      <button onClick={() => sync()}>Refresh</button>
      {/* ... */}
    </div>
  );
}
```

---

## API Reference

### `defineModel(key, options)`

Defines a type-safe IndexedDB model with automatic React integration.

```ts
const Model = defineModel('cart', {
  schema: z.object({ items: z.array(...) }),
  ttl: 5 * 60 * 1000,
  version: 1,
  initialData: { items: [] },
  merge: (current, incoming) => ({ ...current, ...incoming }),
});
```

**Parameters**

- `key: string` - Unique IndexedDB key for this model
- `options.schema: ZodSchema` - Zod schema for validation
- `options.ttl?: number` - Time-to-live in milliseconds (default: `5 * 60 * 1000` = 5 minutes)
  - Set to `Infinity` for data that never expires
  - Set to `0` for always-stale behavior
- `options.version?: number` - Schema version for migrations (requires `initialData`)
- `options.initialData?: T` - Default value when no data exists or version changes
- `options.merge?: (current: T, incoming: T) => T` - Custom conflict resolution for cross-tab sync

**Returns** `Model<T>`

**Model Properties**

- `name: string` - Model key
- `schema: ZodSchema` - Validation schema
- `ttl: number` - Effective TTL value
- `merge: (current, incoming) => T` - Conflict resolver

**Model Methods**

- `getSnapshot(): Promise<T | null>` - Load data from IndexedDB
- `getHistory(): Promise<ModelHistory>` - Get metadata (age, staleness)
- `replace(data: T): Promise<void>` - Replace entire data (including `null`)
- `patch(mutator: (draft: T) => void): Promise<void>` - Update existing data via Immer-style draft mutation
- `subscribe(callback: () => void): () => void` - Listen to changes
- `getCachedSnapshot(): T | null` - Synchronous cached read
- `getCachedHistory(): ModelHistory` - Synchronous cached metadata
- `getCachedError(): FirstTxError | null` - Get last error

**When to use `patch()` vs `replace()`**

Use `patch()` when you have existing data and want to modify specific fields:

```ts
await Model.patch((draft) => {
  draft.items.push(newItem); // Mutate draft in place
  draft.total += 100; // No return statement
});
```

Use `replace()` when you want to completely replace data (including setting/clearing `null`):

```ts
// Set initial data
await Model.replace({ items: [], total: 0 });

// Clear data
await Model.replace(null);
```

⚠️ **Important:** `patch()` requires existing data. If data is `null` and you haven't provided `initialData`, `patch()` will throw an error. Use `replace()` instead.

---

### `useModel(model)`

React hook for local-only model usage (no server sync).

```tsx
const [data, patch, history, error] = useModel(CartModel);
```

**Parameters**

- `model: Model<T>` - Model created with `defineModel`

**Returns** `[data, patch, history, error]`

- `data: T | null` - Current data (null while loading)
- `patch: (mutator: (draft: T) => void) => Promise<void>` - Update function (Immer-style)
  ```ts
  await patch((draft) => {
    draft.items.push(newItem);
  });
  ```
- `history: ModelHistory` - Metadata
  - `updatedAt: number` - Unix timestamp of last update
  - `age: number` - Time elapsed since last update (ms)
  - `isStale: boolean` - Whether `age > ttl`
  - `isConflicted: boolean` - Whether cross-tab conflict occurred
- `error: FirstTxError | null` - Validation or storage error

**Example**

```tsx
const [cart, patch, history] = useModel(CartModel);

if (!cart) return <Skeleton />;

return (
  <div>
    {history.isStale && <Badge>Data is {Math.floor(history.age / 1000)}s old</Badge>}
    <button onClick={() => patch((draft) => draft.items.push(item))}>Add Item</button>
  </div>
);
```

---

### `useSyncedModel(model, fetcher, options?)`

React hook for model with automatic server synchronization.

```tsx
const { data, patch, sync, isSyncing, error, history } = useSyncedModel(CartModel, fetchCart, {
  syncOnMount: 'stale',
  onSuccess: (data) => console.log('Synced', data),
  onError: (err) => console.error(err),
});
```

---

### `useSuspenseSyncedModel(model, fetcher)`

**React 19+ only.** Suspense-enabled hook for declarative data fetching.

```tsx
import { useSuspenseSyncedModel } from '@firsttx/local-first';

function ContactsList() {
  const contacts = useSuspenseSyncedModel(ContactsModel, fetchContacts);

  return (
    <div>
      {contacts.map((c) => (
        <ContactCard key={c.id} {...c} />
      ))}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorAlert />}>
      <Suspense fallback={<Skeleton />}>
        <ContactsList />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Parameters**

- `model: Model<T>` - Model created with `defineModel`
- `fetcher: (current: T | null) => Promise<T>` - Async data fetcher

**Returns** `T`

- Direct data (never `null`)
- Throws Promise for Suspense on initial load
- Throws Error for Error Boundary on fetch failure

**Key Differences from `useSyncedModel`**

| Feature        | `useSyncedModel`           | `useSuspenseSyncedModel`  |
| -------------- | -------------------------- | ------------------------- |
| Return type    | `{ data: T \| null, ... }` | `T` (never null)          |
| Loading state  | Manual `if (isSyncing)`    | Automatic Suspense        |
| Error handling | Manual `if (error)`        | Automatic Error Boundary  |
| Type safety    | Nullable data              | Non-nullable data         |
| React version  | 18+                        | 19+                       |
| Use case       | Full control, mutations    | Simple read-only fetching |

**Requirements**

- React 19+ (requires `use()` hook)
- Must be wrapped in `<Suspense>` boundary
- Recommended: wrap in `<ErrorBoundary>`

**Limitations**

- Read-only (use `useSyncedModel` for `patch()` or mutations)
- Not suitable for SSR (client-side only)
- Initial load only (no revalidation UI feedback)

**Example: Dashboard with Multiple Models**

```tsx
function Dashboard() {
  return (
    <ErrorBoundary fallback={<ErrorAlert />}>
      <Suspense fallback={<DashboardSkeleton />}>
        <StatsCards />
        <RecentActivity />
      </Suspense>
    </ErrorBoundary>
  );
}

function StatsCards() {
  const stats = useSuspenseSyncedModel(StatsModel, fetchStats);
  const contacts = useSuspenseSyncedModel(ContactsModel, fetchContacts);

  return (
    <div>
      <Card>Total: {stats.total}</Card>
      <Card>Contacts: {contacts.length}</Card>
    </div>
  );
}
```

**When to use Suspense?**

✅ Use `useSuspenseSyncedModel` when:

- Simple read-only data display
- Want declarative loading/error states
- Building with React 19+
- Prefer less boilerplate

❌ Use `useSyncedModel` when:

- Need mutations (`patch()`, manual `sync()`)
- Want granular control over loading UI
- Supporting React 18
- Building SSR apps

---

### `useSyncedModel(model, fetcher, options?)` (continued)

**Parameters**

- `model: Model<T>` - Model created with `defineModel`
- `fetcher: (current: T | null) => Promise<T>` - Function to fetch server data
  - Receives current local data for delta sync support
  - Should return full data to replace local state
- `options?: SyncOptions`
  - `syncOnMount?: 'always' | 'stale' | 'never'` (default: `'stale'`)
    - `'always'`: Always sync on component mount
    - `'stale'`: Only sync when `history.isStale === true`
    - `'never'`: Never auto-sync, only manual `sync()` calls
  - `onSuccess?: (data: T) => void` - Called after successful sync
  - `onError?: (error: Error) => void` - Called on sync failure

**Returns** `SyncedModelResult<T>`

- `data: T | null` - Current data
- `patch: (mutator: (draft: T) => void) => Promise<void>` - Update existing data via draft mutation
- `replace: (data: T) => Promise<void>` - Replace entire data
- `sync: () => Promise<void>` - Manual sync trigger
  - Safe to call multiple times (automatically deduplicated)
  - Uses ViewTransition for smooth updates (if available)
- `isSyncing: boolean` - Whether sync is in progress
- `error: Error | null` - Sync error (not validation errors)
- `history: ModelHistory` - Metadata (same as `useModel`)

**Example**

```tsx
const {
  data: cart,
  sync,
  isSyncing,
} = useSyncedModel(
  CartModel,
  async (current) => {
    // Delta sync example
    const since = current ? new Date(current.lastSync) : null;
    const res = await fetch(`/api/cart?since=${since}`);
    return res.json();
  },
  { syncOnMount: 'stale' },
);

return (
  <div>
    <button onClick={() => sync()} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Refresh'}
    </button>
    {/* ... */}
  </div>
);
```

**Sync Behavior**

```
Mount → Load IndexedDB → Check isStale
  ↓
if syncOnMount === 'always' → sync()
if syncOnMount === 'stale' && isStale → sync()
if syncOnMount === 'never' → do nothing
```

---

## Features

### Cross-Tab Synchronization

Automatically syncs changes across all open tabs using BroadcastChannel API.

```ts
// Tab 1
await CartModel.patch((draft) => draft.items.push(item));

// Tab 2 (instantly receives update via BroadcastChannel)
// React re-renders with new data (~1ms latency)
```

**How it works**

- Every `patch()` or `replace()` broadcasts to other tabs
- Tabs auto-reload from IndexedDB on receiving broadcast
- Custom `merge()` function resolves conflicts
- Zero network overhead (browser-internal communication)
- Graceful degradation (97%+ browser support)

**Conflict Resolution**

```ts
const Model = defineModel('cart', {
  schema: CartSchema,
  merge: (current, incoming) => {
    // Custom merge logic
    return {
      items: [...current.items, ...incoming.items].filter(uniqueById),
      total: recalculate(merged.items),
    };
  },
});
```

---

### TTL-Based Staleness

Data automatically expires based on TTL, triggering smart refetches.

```tsx
const Model = defineModel('prices', {
  schema: PriceSchema,
  ttl: 30 * 1000, // 30 seconds
});

const { data, history } = useSyncedModel(Model, fetchPrices, {
  syncOnMount: 'stale', // refetch when age > 30s
});

// Visual feedback
{
  history.isStale && <Badge variant="warning">Prices may be outdated</Badge>;
}
```

**TTL Use Cases**

- `30s - 5min`: Real-time data (stock prices, live scores)
- `5min - 1hr`: Frequently updated (product inventory, user notifications)
- `1hr - 24hr`: Slow-changing (user profile, settings)
- `Infinity`: Static content (translations, constants)

---

### Schema Validation

Zod schema protects against corrupted IndexedDB data.

```ts
const Model = defineModel('cart', {
  schema: z.object({
    items: z.array(ItemSchema),
    total: z.number().nonnegative(),
  }),
});

// Invalid data is rejected
await Model.replace({ items: [], total: -100 }); // ❌ ValidationError
```

**Error Handling**

```tsx
const [data, patch, history, error] = useModel(Model);

if (error) {
  return <ErrorBanner error={error} onReset={() => Model.replace(initialData)} />;
}
```

---

## Advanced

### Schema Migrations

```ts
const UserModel = defineModel('user', {
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(), // added in v2
  }),
  version: 2,
  initialData: { id: '', name: '', email: '' },
});

// On version mismatch:
// 1. Old data is deleted
// 2. initialData is written
// 3. Next sync fetches fresh data
```

---

## Error Types

```ts
import { FirstTxError, StorageError, ValidationError } from '@firsttx/local-first';

try {
  await Model.replace(data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Schema validation failed:', error.zodError);
  } else if (error instanceof StorageError) {
    console.error('IndexedDB error:', error.code, error.context);
  }
}
```

---

## Related Packages

- [`@firsttx/tx`](https://www.npmjs.com/package/@firsttx/tx) - Atomic transactions for optimistic updates
- [`@firsttx/prepaint`](https://www.npmjs.com/package/@firsttx/prepaint) - Instant page restoration

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
