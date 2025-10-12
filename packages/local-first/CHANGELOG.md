# @firsttx/local-first

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
