# @firsttx/local-first

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
