# @firsttx/local-first

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
