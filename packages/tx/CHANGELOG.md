# @firsttx/tx

## 0.2.0

### Minor Changes

add useTx hook for React integration

- Add useTx hook with React Query-style API
- Support optimistic updates with automatic rollback
- Include isPending, isError, isSuccess states
- Add onSuccess/onError callbacks
- Fix retry options to apply to request step (not optimistic step)
- Add unmount safety checks to prevent memory leaks
- Export UseTxConfig and UseTxResult types
- Add comprehensive test suite (13 tests)

## 0.1.2

### Patch Changes

FIX

- reset step timeout timer between runs

DOCS

- update README

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
