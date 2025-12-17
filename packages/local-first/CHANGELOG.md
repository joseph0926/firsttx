# @firsttx/local-first

## 0.11.0

### Minor Changes

### Changed

- All error classes (`FirstTxError`, `StorageError`, `ValidationError`) now inherit from `BaseFirstTxError`
- Each error now has a `domain` property set to `'local-first'`
- Each error now has a structured `code` property (e.g., `'STORAGE_QUOTA_EXCEEDED'`, `'VALIDATION_FAILED'`)

### Removed

- Duplicate `DEFAULT_TTL_MS` constant in `model.ts` (now imported from @firsttx/shared)

### Added

- `LocalFirstErrorCode` type for type-safe error code handling

### Breaking Changes

- `StorageError.context` → `StorageError.storageContext`
- `StorageError.code` → `StorageError.storageCode` (original storage code like `'QUOTA_EXCEEDED'`)
- New `StorageError.code` property returns prefixed codes (e.g., `'STORAGE_QUOTA_EXCEEDED'`)

## 0.10.0

### Minor Changes

Added explicit external config in tsup for react, react/jsx-runtime, react/jsx-dev-runtime, and zod to prevent duplicate module instances when used in consumer applications.

## 0.9.4

### Patch Changes

- Updated dependencies
  - @firsttx/shared@0.2.3

## 0.9.3

### Patch Changes

- Updated dependencies
  - @firsttx/shared@0.2.2

## 0.9.2

### Patch Changes

- Updated dependencies
  - @firsttx/shared@0.2.1

## 0.9.1

### Patch Changes

- update dependencies @firsttx/shared

## 0.9.0

### Minor Changes

### Refactor

- Split `defineModel` (660+ lines) into `CacheManager`, `StorageManager`, and `SyncManager` classes
- Extract cache state management into dedicated `CacheManager` class
- Extract IndexedDB operations into `StorageManager` class
- Extract sync logic and promise caching into `SyncManager` class

### Dependencies

- Add `@firsttx/shared` as dependency

## 0.8.3

### Patch Changes

- changing peerDependencies

## 0.8.2

### Patch Changes

- Widen React peer dependency range from `^19.2.1` to `^19.0.0` for broader compatibility with React 19.x users

## 0.8.1

### Patch Changes

**Breaking Changes**

- Removed storageKey option: The model name is now always used as the IndexedDB key. This simplifies the API and removes unnecessary complexity.

**Changed**

- Decoupled version and initialData: These options are now independent. When version changes, existing data is deleted. If initialData is provided, it will be used for initialization; otherwise, null is returned allowing fresh data to be fetched from the server.

## 0.8.0

### Minor Changes

**Breaking Changes**
useModel now returns an object instead of an array. Migration required

```ts
// Before
const [data, patch, history, error] = useModel(Model);

// After
const { data, status, patch, history, error } = useModel(Model);
```

**Features**
Add status field to useModel and useSyncedModel. The new status field ('loading' | 'success' | 'error') allows explicit state handling instead of relying on !data checks

```ts
const { data, status } = useModel(CartModel);

if (status === 'loading') return <Skeleton />;
if (status === 'error') return <ErrorMessage />;
if (!data) return <EmptyState />;
```

Add CacheStatus type. New exported type for type-safe status handling.

## 0.7.0

### Minor Changes

- Fix timeout handling so long-running steps and retries are aborted with proper errors. & Add storageKey option to avoid IndexedDB key collisions and apply user-defined merge when replacing data. & Add route-key override and sensitive-field scrubbing to snapshot capture; make capture tests memory/Offline-friendly.

## 0.7.0

### Minor Changes

Add storageKey option to avoid IndexedDB key collisions and apply user-defined merge when replacing data.

## 0.6.0

### Minor Changes

- **BREAKING**: Changed `syncOnMount` default value from `'stale'` to `'always'` in `useSyncedModel`

  Previously, `useSyncedModel` would only sync on mount if cached data exceeded TTL. Now it always syncs to ensure data freshness, similar to React Query's `staleTime: 0` default.

- **Migration:** To preserve the old behavior, explicitly set `syncOnMount: 'stale'`:

  ```typescript
  // Before (implicit 'stale')
  useSyncedModel(model, fetcher);

  // After (explicit 'stale' to preserve old behavior)
  useSyncedModel(model, fetcher, { syncOnMount: 'stale' });
  ```

- **Feature**: Added options parameter to useSuspenseSyncedModel You can now control background revalidation and handle sync lifecycle events

```ts
const data = useSuspenseSyncedModel(model, fetcher, {
  revalidateOnMount: 'always' | 'stale' | 'never', // default: 'always'
  onSuccess: (data) => console.log('Synced:', data),
  onError: (error) => console.error('Sync failed:', error),
});
```

- **Patch Changes**
- Enhanced Model.getSyncPromise to accept SyncPromiseOptions for granular control over revalidation behavior
- Added onSuccess and onError callback support in background revalidation
- Exported new SuspenseSyncOptions type for public API
- Updated all affected tests to accommodate new default behavior

## 0.5.3

### Patch Changes

- Refactored `useSuspenseSyncedModel` to eliminate React 19's "uncached promise" warnings by replacing the `use()` hook with a more stable pattern combining `useSyncExternalStore` and direct promise throwing. This change aligns with proven patterns used by major data-fetching libraries like TanStack Query and SWR.

## 0.5.2

### Patch Changes

- Improved `useSuspenseSyncedModel` to leverage IndexedDB cache on page refresh, implementing stale-while-revalidate pattern. This eliminates unnecessary network requests and blank screens on revisits, with 50% faster IndexedDB reads through combined data + history retrieval.

## 0.5.1

### Patch Changes

- pevents infinite render loops through Promise instance stability

## 0.5.0

### Minor Changes

- Add `useSuspenseSyncedModel` hook for React 19+ Suspense integration

  This new hook provides a declarative approach to data fetching with automatic Suspense and Error Boundary integration, reducing boilerplate code and improving type safety.

**New API**

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
```

**Key Features**

- Non-nullable return type (T instead of T | null) for better type safety
- Automatic Suspense boundary integration - no manual loading state management
- Automatic Error Boundary integration - errors thrown declaratively
- Promise caching at Model level to prevent infinite loops
- Concurrent request deduplication

**Requirements**

- React 19+ (uses the use() hook)
- Must be wrapped in <Suspense> boundary
- Recommended to wrap in <ErrorBoundary>

## 0.4.3

### Patch Changes

### 🐛 Bug Fixes

- **BroadcastChannel Fallback**: Added fallback for environments where BroadcastChannel is not supported ([#2612103](commit-hash))

### 🔄 Refactoring

- **SSR Compatibility**: Prevent crashes when using in SSR framework client components ([#7c498ff](commit-hash))

## 0.4.2

### Patch Changes

**Added**

- DevTools integration: added comprehensive event emission for model lifecycle debugging
- `init` events: emitted when model is initialized with TTL and version info
- `load` events: emitted when data is loaded from IndexedDB with age and staleness status
- `patch` events: emitted on Immer-based updates with operation details and duration
- `replace` events: emitted on full data replacement with source tracking (sync/broadcast/manual)
- `sync.start` events: emitted when sync begins with trigger reason (mount/manual/stale)
- `sync.success` events: emitted on successful sync with data size and change detection
- `sync.error` events: emitted on sync failures with error details and retry status
- `broadcast` events: emitted on cross-tab synchronization via BroadcastChannel
- `validation.error` events: emitted on Zod schema validation failures with path info

**Changed**

- Internal: added `emitModelEvent()` calls throughout model operations
- No breaking changes to public API or hooks behavior

**Technical**

- Events use priority system (LOW for routine ops, NORMAL for syncs, HIGH for errors)
- All events include modelName for filtering and debugging
- Broadcast events include senderId to track cross-tab communication origin
- Events are gracefully no-op when DevTools extension is not present

## 0.4.1

### Patch Changes

**Features**

- Made `ttl` parameter optional in `defineModel` with 5-minute default (`5 * 60 * 1000` ms)
- Added automatic TTL fallback: explicit option > global default > built-in 5min

**Bug Fixes**

- Fixed flaky tests by ensuring IndexedDB cleanup completes before each test
- Changed staleness check from `age > ttl` to `age >= ttl` for correct 0 TTL handling

**Documentation**

- Added comprehensive API Reference section with all parameters and return types
- Documented TTL strategies and use cases (30s for real-time, Infinity for static)
- Added cross-tab synchronization details and conflict resolution examples
- Included schema validation and migration guides

**Tests**

- Added 6 test cases for TTL edge cases (default, explicit, Infinity, 0, version)
- Centralized test setup in `tests/setup.ts` for consistent IndexedDB cleanup

## 0.4.0

### Minor Changes

Implement real-time model synchronization across browser tabs using BroadcastChannel API.

- Add ModelBroadcaster singleton for managing cross-tab communication
- Integrate broadcast into model.ts patch/replace operations
- Refactor persist logic to separate updateCache and reloadCache
- Add comprehensive test coverage for broadcast functionality

**Benefits**

- Eliminates stale UI state in inactive tabs
- Zero network overhead (browser-internal messaging)
- Maintains data consistency across all open tabs
- Prevents user confusion from outdated displays

**Technical details**

- Messages include senderId to prevent infinite loops
- `Map<string, Set<callback>>` for multi-model support
- Graceful degradation for unsupported browsers

## 0.3.3

### Patch Changes

**FIX**

- serialize mutations and recover from invalid state

## 0.3.2

### Patch Changes

FIX

- reset IndexedDB promise after open errors

TEST

- add comprehensive first-visit

DOCS

- update README

## 0.3.1

### Patch Changes

delay auto-sync until model hydration to prevent premature stale checks

Previously, useSyncedModel triggered sync-on-mount before IndexedDB hydration,
causing stale mode ('syncOnMount: "stale"') to always refetch on every reload.
This change defers the auto-sync decision until after the model's history has
been loaded, ensuring sync only runs when data is actually stale.

## 0.3.0

### Minor Changes

**replace autoSync with syncOnMount for clarity**

BREAKING CHANGE: Remove `autoSync` option in favor of `syncOnMount`

- Replace boolean `autoSync` with explicit `syncOnMount: 'always' | 'stale' | 'never'`
- Change default behavior: sync on mount when data is stale (was: no auto-sync)
- Align with React Query's refetch trigger pattern
- Improve synergy with Prepaint's instant replay on revisit

Migration:

- `autoSync: true` → `syncOnMount: 'stale'` (or omit, it's default)
- `autoSync: false` → `syncOnMount: 'never'`

Fixes:

- Remove ambiguity of "when does auto-sync trigger?"
- Fix test assumptions about mount-time sync behavior
- Prevent race conditions in unmount tests with `syncInProgressRef`

## 0.2.2

### Patch Changes

fix(local-first): prevent infinite loop in useModel by stabilizing references

- Add useCallback to patch function in useModel to prevent recreation on every render
- Optimize updateSnapshot to only create new object when data actually changes
- Fixes issue where useSyncExternalStore triggered infinite re-renders due to unstable object references

## 0.2.1

### Patch Changes

- Adopts TanStack Query's single-subscription pattern using getCombinedSnapshot to prevent infinite loops caused by unstable references in useSyncExternalStore. Reduces subscribers from 3 to 1 per model while maintaining React 18 concurrent mode compatibility.

## 0.2.0

### Minor Changes

- add useSyncedModel hook for server sync

## 0.1.2

### Patch Changes

- fix test and fix some patch bugs

## 0.1.1

### Patch Changes

- resolve IndexedDB store name collision

## 0.1.0

### Minor Changes

- First public release with core features: IndexedDB models with React integration / Atomic transactions with automatic rollback

## 0.0.1

### Patch Changes

- @firsttx/local-first: initial release

```

```
