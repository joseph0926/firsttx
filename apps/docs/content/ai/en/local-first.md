# Local-First

## What is Local-First?

Local-First is an IndexedDB-based data layer. It caches server data locally, preserves data in offline scenarios, and synchronizes it in real time across multiple tabs.

Key features:

- Validates data types and integrity with Zod schemas
- Provides TTL (Time-To-Live) based cache expiration management
- Supports real-time synchronization between tabs via BroadcastChannel
- Uses React 18’s `useSyncExternalStore` for stable state management

## defineModel

Defines a model. A model is a unit of data stored in IndexedDB.

```typescript
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const UserModel = defineModel('user', {
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  initialData: {
    id: '',
    name: '',
    email: '',
  },
  ttl: 5 * 60 * 1000, // 5 minutes
});
```

### Options

| Option        | Type                             | Required                      | Default              | Description                                                                                 |
| ------------- | -------------------------------- | ----------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `schema`      | `z.ZodType<T>`                   | Yes                           | -                    | Zod schema used for data validation                                                         |
| `initialData` | `T`                              | Required when using `version` | -                    | Initial data used when no stored data exists or when the version has changed                |
| `version`     | `number`                         | No                            | -                    | Schema version. When changed, existing data is deleted and reinitialized with `initialData` |
| `ttl`         | `number`                         | No                            | `300000` (5 minutes) | Cache expiration time (ms). After this time, the data becomes stale                         |
| `merge`       | `(current: T, incoming: T) => T` | No                            | `(_, next) => next`  | Function that merges server data with local data                                            |
| `storageKey`  | `string`                         | No                            | Model name           | Key used in IndexedDB. Defaults to the model name passed as the first argument              |

### version and initialData

By specifying `version`, you can automatically migrate existing data when the schema changes.

```typescript
const CartModel = defineModel('cart', {
  schema: z.object({
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      qty: z.number(),
      // Field added in v2
      price: z.number(),
    })),
  }),
  version: 2, // When the version is increased, existing v1 data is deleted
  initialData: {
    items: [],
  },
});
```

When using `version`, you must provide `initialData`. When the version changes, existing data is deleted and reinitialized with `initialData`.

### merge function

Defines how to merge server data with local data. The default behavior completely overwrites local data with server data.

```typescript
const CartModel = defineModel('cart', {
  schema: cartSchema,
  initialData: { items: [] },
  // Merge server data while keeping items that exist only locally
  merge: (local, server) => ({
    items: [
      ...server.items,
      ...local.items.filter(
        localItem => !server.items.some(s => s.id === localItem.id)
      ),
    ],
  }),
});
```

## Model methods

The Model object returned by `defineModel` provides the following methods.

### patch

Partially modifies local data. This is used for optimistic updates.

```typescript
await CartModel.patch((draft) => {
  draft.items.push({ id: '1', name: 'Item', qty: 1 });
});
```

The mutator function receives data that has been cloned with `structuredClone`. You can mutate the object directly inside the function. After mutation, validation is performed using the Zod schema; if validation fails, a ValidationError is thrown.

### replace

Replaces the entire data. This is used internally when synchronizing with the server.

```typescript
const serverData = await fetchCart();
await CartModel.replace(serverData);
```

If a `merge` option is defined, it is used to merge the existing data with the new data.

### getSnapshot

Asynchronously reads the current data from IndexedDB.

```typescript
const data = await CartModel.getSnapshot();
if (data) {
  console.log('Stored data:', data);
}
```

### getHistory

Retrieves metadata about the data.

```typescript
const history = await CartModel.getHistory();
console.log('Last updated at:', new Date(history.updatedAt));
console.log('Is stale:', history.isStale);
```

## useModel

This is the basic hook for subscribing to model data. It is suitable when you want to use only local data without server synchronization.

```typescript
import { useModel } from '@firsttx/local-first';

function CartBadge() {
  const { data, status, error, history, patch } = useModel(CartModel);

  if (status === 'loading') return <span>...</span>;
  if (status === 'error') return <span>!</span>;

  return <span>{data?.items.length ?? 0}</span>;
}
```

### Return value

| Field     | Type                                             | Description                                    |
| --------- | ------------------------------------------------ | ---------------------------------------------- |
| `data`    | `T \| null`                                      | Current data. `null` while loading or on error |
| `status`  | `'loading' \| 'success' \| 'error'`              | Current status                                 |
| `error`   | `FirstTxError \| null`                           | Error object                                   |
| `history` | `ModelHistory`                                   | Metadata                                       |
| `patch`   | `(mutator: (draft: T) => void) => Promise<void>` | Function to modify data                        |

## useSyncedModel

This hook includes server synchronization and is used in most cases.

```typescript
import { useSyncedModel } from '@firsttx/local-first';

async function fetchCart(current: Cart | null) {
  const res = await fetch('/api/cart');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

function CartPage() {
  const { data, status, isSyncing, sync, patch, error } = useSyncedModel(
    CartModel,
    fetchCart,
    {
      syncOnMount: 'stale',
      onSuccess: (data) => console.log('Sync completed:', data),
      onError: (error) => console.error('Sync failed:', error),
    }
  );

  return (
    <div>
      {isSyncing && <span>Syncing...</span>}
      <button onClick={sync}>Refresh</button>
      <ul>
        {data?.items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### fetcher function

The fetcher receives the current local data as an argument. You can use it to implement incremental synchronization.

```typescript
async function fetchCart(current: Cart | null) {
  // If current exists, request only the changes since the last sync
  const since = current ? `?since=${current.lastSync}` : '';
  const res = await fetch(`/api/cart${since}`);
  return res.json();
}
```

### Options

| Option        | Type                             | Default    | Description                   |
| ------------- | -------------------------------- | ---------- | ----------------------------- |
| `syncOnMount` | `'always' \| 'stale' \| 'never'` | `'always'` | Strategy for syncing on mount |
| `onSuccess`   | `(data: T) => void`              | -          | Callback when sync succeeds   |
| `onError`     | `(error: Error) => void`         | -          | Callback when sync fails      |

#### syncOnMount options

- `'always'`: Always synchronize with the server when the component mounts.
- `'stale'`: Synchronize only when TTL has expired; otherwise, use local cache.
- `'never'`: Do not synchronize automatically; only synchronize when `sync()` is called.

### Return value

In addition to the values returned by `useModel`:

| Field       | Type                  | Description                            |
| ----------- | --------------------- | -------------------------------------- |
| `sync`      | `() => Promise<void>` | Function for manual synchronization    |
| `isSyncing` | `boolean`             | Whether synchronization is in progress |

## useSuspenseSyncedModel

This hook is used together with React Suspense. It suspends component rendering until data is ready.

```typescript
import { Suspense } from 'react';
import { useSuspenseSyncedModel } from '@firsttx/local-first';

function CartList() {
  // Suspend until data is available
  const cart = useSuspenseSyncedModel(CartModel, fetchCart, {
    revalidateOnMount: 'stale',
  });

  // cart is always of type T (never null)
  return (
    <ul>
      {cart.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}

function CartPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CartList />
    </Suspense>
  );
}
```

### Options

| Option              | Type                             | Default    | Description                                                    |
| ------------------- | -------------------------------- | ---------- | -------------------------------------------------------------- |
| `revalidateOnMount` | `'always' \| 'stale' \| 'never'` | `'always'` | Strategy for background revalidation after showing cached data |
| `onSuccess`         | `(data: T) => void`              | -          | Callback when sync succeeds                                    |
| `onError`           | `(error: Error) => void`         | -          | Callback when sync fails                                       |

This hook behaves as follows:

1. If cached data exists, it returns it immediately.
2. Based on `revalidateOnMount`, it fetches data from the server in the background.
3. If there is no cache, it calls the fetcher and throws a Promise to trigger Suspense.

## ModelHistory

This object contains metadata about the data.

```typescript
interface ModelHistory {
  updatedAt: number;     // Last update time (Unix timestamp)
  age: number;           // Elapsed time since update (ms)
  isStale: boolean;      // Whether age > ttl
  isConflicted: boolean; // Conflict state (currently not implemented)
}
```

### Example usage

```typescript
function CartStatus() {
  const { history } = useModel(CartModel);

  if (history.isStale) {
    return <span>The data is outdated. Please refresh.</span>;
  }

  const minutes = Math.floor(history.age / 60000);
  return <span>Updated {minutes} minute(s) ago</span>;
}
```

## Synchronization across tabs

Local-First uses the BroadcastChannel API to synchronize data in real time across multiple tabs.

How it works:

1. When `patch()` or `replace()` is called in one tab, the data is saved to IndexedDB.
2. At the same time, a change notification is sent to other tabs via BroadcastChannel.
3. Tabs that receive the notification read the latest data from IndexedDB.
4. React components are re-rendered automatically.

In environments that do not support BroadcastChannel (e.g. some versions of Safari), it automatically falls back to a degraded mode. In this case, real-time sync across tabs does not occur, but the latest data is read from IndexedDB when the page is refreshed.

## Storage

Data is stored in the `firsttx-local-first` database in IndexedDB.

- Database name: `firsttx-local-first`
- Store name: `models`
- Key: `storageKey` option or the model name

### Storage structure

```typescript
interface StoredModel<T> {
  _v: number;        // Schema version
  updatedAt: number; // Last update time
  data: T;           // Actual data
}
```

## Error handling

### StorageError

This is an IndexedDB-related error.

```typescript
type StorageErrorCode =
  | 'QUOTA_EXCEEDED'    // Storage quota exceeded
  | 'PERMISSION_DENIED' // No access permission
  | 'UNKNOWN';          // Unknown error
```

### ValidationError

This error occurs when validation against a Zod schema fails.

```typescript
try {
  await CartModel.patch((draft) => {
    draft.items.push({ invalid: 'data' }); // Does not match the schema
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.zodError.issues);
  }
}
```

In development, if stored data does not match the schema, a ValidationError is thrown. In production, the data is silently deleted and `null` is returned.

For detailed error types, refer to `errors.md`.
