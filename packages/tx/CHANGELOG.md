# @firsttx/tx

## 0.1.1

### Patch Changes

implement transaction timeout and failed status handling

- Add timeout mechanism using Promise.race() for overall transaction lifecycle
- Properly set 'failed' status when compensation fails (previously stayed 'rolled-back')
- Add comprehensive test coverage for timeout scenarios and status transitions

This ensures transactions don't hang indefinitely and accurately reflect their final state.

## 0.1.0

### Minor Changes

- First public release with core features: IndexedDB models with React integration / Atomic transactions with automatic rollback
