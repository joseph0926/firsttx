# API Reference

## Prepaint

### `createFirstTxRoot(container, element, options?)`

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

## Local-First

### `defineModel(key, options)`

Defines an IndexedDB model.

```tsx
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const CartModel = defineModel('cart', {
  schema: z.object({ items: z.array(...) }),
  ttl: 5 * 60 * 1000, // optional
});
```

**Parameters**

- `key: string` - IndexedDB key (must be unique)
- `options.schema: ZodSchema` - Zod schema
- `options.ttl?: number` - Time-to-live in milliseconds (default: `5 * 60 * 1000` = 5 minutes)
- `options.version?: number` - Schema version for migrations
- `options.initialData?: T` - Initial data (required if version is set)
- `options.merge?: (current: T, incoming: T) => T` - Conflict resolution function

### `useSyncedModel(model, fetcher, options?)`

Automatically syncs model with server.

```tsx
const { data, status, patch, sync, isSyncing, error, history } = useSyncedModel(
  CartModel,
  fetchCart,
  {
    syncOnMount: 'stale',
    onSuccess: (data) => console.log('Synced'),
    onError: (err) => console.error(err),
  },
);
```

**Parameters**

- `model: Model<T>` - Model created with defineModel
- `fetcher: (current: T | null) => Promise<T>` - Function to fetch server data. `current` is the locally stored data (or `null` if none)
  - Incremental updates: Request only changes since last update
  - Conditional requests: Skip server request if local data is valid
  - Merging: Combine local and server state
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
- `status: 'loading' | 'success' | 'error'` - Current loading status
- `patch: (fn: (draft: T) => void) => Promise<void>` - Update existing data via draft mutation
- `replace: (data: T) => Promise<void>` - Replace entire data
- `sync: () => Promise<void>` - Manual sync
- `isSyncing: boolean` - Whether syncing with server
- `error: Error | null` - Sync error
- `history: ModelHistory` - Metadata
  - `age: number` - Time elapsed since last update (ms)
  - `isStale: boolean` - Whether TTL exceeded
  - `updatedAt: number` - Last update timestamp

### `useSuspenseSyncedModel(model, fetcher)`

**React 18.2+ supported.** Suspense-enabled hook for declarative data fetching.

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

- `model: Model<T>` - Model created with defineModel
- `fetcher: (current: T | null) => Promise<T>` - Async data fetcher

**Returns** `T` (never `null`)

**Key differences:**

- No manual loading checks - automatic Suspense integration
- Non-nullable return type for better type safety
- Automatic Error Boundary integration
- Must wrap in `<Suspense>` boundary
- Read-only (use `useSyncedModel` for mutations)

### When to use `patch()` vs `replace()`

**Use `patch()` when:**

- You have existing data (`data !== null`)
- You want to modify specific fields via Immer-style draft mutation
- Example: Adding items to a cart, updating counters

```tsx
// Modify existing data
await patch((draft) => {
  draft.items.push(newItem);
  draft.total += newItem.price;
  // No return statement - mutate draft in place
});
```

**Use `replace()` when:**

- You want to completely replace data (including `null`)
- Initial state is `null` and you're setting first value
- Example: Login (null → user data), Logout (user → null)

```tsx
// Login - set initial data
await replace({ accessToken: 'xxx', user: {...} });

// Logout - clear data
await replace(null);
```

**Important: `patch()` requires existing data**

If you try to use `patch()` when `data` is `null`, you'll get an error unless you've provided `initialData`:

```tsx
// Error: Cannot patch when data is null
const AuthModel = defineModel('auth', {
  schema: AuthSchema.nullable(),
  initialData: null,  // data starts as null
});

await AuthModel.patch((draft) => {
  draft.token = 'xxx'; // Error: Cannot read property of null
});

// Use replace instead
await AuthModel.replace({ token: 'xxx', user: {...} });
```

### Cross-Tab Synchronization

Automatically synchronizes model changes across all open tabs using BroadcastChannel API.

- ~1ms sync latency between tabs
- Zero network overhead (browser-internal)
- Automatic consistency across all tabs
- Graceful degradation for older browsers (97%+ support)

---

## Tx

### `startTransaction(options?)`

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
    retry: {
      maxAttempts: 3,
      delayMs: 1000,
      backoff: 'exponential', // or 'linear'
    },
  },
);

await tx.commit();
```

**tx.run Parameters**

- `fn: () => Promise<T>` - Function to execute
- `options?.compensate: () => Promise<void>` - Rollback function on failure
- `options?.retry: RetryConfig` - Retry configuration
  - `maxAttempts?: number` - Maximum retry attempts (default: `1`)
  - `delayMs?: number` - Base delay between retries in milliseconds (default: `100`)
  - `backoff?: 'exponential' | 'linear'` - Backoff strategy (default: `'exponential'`)

**Backoff strategies:**

- `exponential`: 100ms → 200ms → 400ms → 800ms (delay × 2^attempt)
- `linear`: 100ms → 200ms → 300ms → 400ms (delay × attempt)

### `useTx(config)`

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
- `config.retry?` - Retry config `{ maxAttempts?, delayMs?, backoff?: 'exponential' | 'linear' }`
- `config.onSuccess?` - Success callback
- `config.onError?` - Error callback

**Returns**

- `mutate(variables)` - Execute transaction
- `isPending`, `isError`, `isSuccess` - State flags
- `error` - Error object
