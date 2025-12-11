# @firsttx/tx

## 0.5.4

### Patch Changes

### Dependencies

- Add `@firsttx/shared` as dependency for Turborepo build order

## 0.5.3

### Patch Changes

- Widen React peer dependency range from `^19.2.1` to `^19.0.0` for broader compatibility with React 19.x users

## 0.5.2

### Patch Changes

- Fix timeout handling so long-running steps and retries are aborted with proper errors. & Add storageKey option to avoid IndexedDB key collisions and apply user-defined merge when replacing data. & Add route-key override and sensitive-field scrubbing to snapshot capture; make capture tests memory/Offline-friendly.

## 0.5.2

### Patch Changes

Fix timeout handling so long-running steps and retries are aborted with proper errors.

## 0.5.1

### Patch Changes

### Added

- **Cancellable Transactions**: Transactions can now be cancelled manually or automatically on unmount
  - `cancel()` method in `UseTxResult` to manually cancel pending transactions
  - `cancelOnUnmount` option in `UseTxConfig` to auto-cancel when component unmounts
  - Prevents memory leaks from stale requests continuing after component unmounts
  - Prevents unnecessary network usage when user navigates away
  - Example:

    ```typescript
    const { mutate, cancel, isPending } = useTx({
      optimistic: async () => {
        /* ... */
      },
      rollback: async () => {
        /* ... */
      },
      request: async () => {
        /* ... */
      },
      cancelOnUnmount: true,
    });

    const handleClose = () => {
      cancel(); // Manual cancellation
      onOpenChange(false);
    };
    ```

### Changed

- Transaction execution now checks for cancellation at each step
- Cancelled transactions throw `Error('Transaction cancelled')` without triggering `onError`

### Migration

No breaking changes. Existing code continues to work:

```typescript
// Before (still works)
const { mutate, isPending } = useTx({
  optimistic: async () => {},
  rollback: async () => {},
  request: async () => {},
});

// After (new capability)
const { mutate, cancel, isPending } = useTx({
  optimistic: async () => {},
  rollback: async () => {},
  request: async () => {},
  cancelOnUnmount: true, // Auto-cancel on unmount
});

cancel(); // Manual cancel
```

## 0.5.0

### Minor Changes

### Added

- **Snapshot Passing**: `optimistic` can now return a value that gets passed to `rollback` and `onSuccess`
  - `optimistic: (variables) => Promise<TSnapshot>` - Returns snapshot data
  - `rollback: (variables, snapshot?) => Promise<void>` - Receives snapshot for cleanup
  - `onSuccess: (result, variables, snapshot?) => void` - Receives snapshot for finalization
  - Eliminates need for `useState` to track temporary IDs or previous data
  - Prevents memory leaks and closure issues in concurrent transactions
  - Example:
    ```typescript
    useTx({
      optimistic: async (input) => {
        const tempId = `temp-${Date.now()}`;
        await Model.patch((draft) => draft.push({ id: tempId, ...input }));
        return tempId; // Snapshot
      },
      rollback: async (input, tempId) => {
        await Model.patch((draft) => {
          const index = draft.findIndex((item) => item.id === tempId);
          if (index !== -1) draft.splice(index, 1);
        });
      },
      onSuccess: async (data, input, tempId) => {
        await Model.patch((draft) => {
          const index = draft.findIndex((item) => item.id === tempId);
          if (index !== -1) draft[index] = data.result;
        });
      },
    });
    ```

### Changed

- `UseTxConfig` now accepts optional third generic parameter `TSnapshot` (defaults to `void`)
- All existing code remains compatible with `TSnapshot = void` default

### Migration

No breaking changes. Existing code continues to work:

```typescript
// Before (still works)
useTx({
  optimistic: async () => {},
  rollback: async () => {},
  // ...
});

// After (new capability)
useTx({
  optimistic: async () => 'snapshot-data',
  rollback: async (vars, snapshot) => {
    /* use snapshot */
  },
  // ...
});
```

## 0.4.1

### Patch Changes

- **RETRY_PRESETS**: Pre-configured retry strategies for common scenarios
  - `RETRY_PRESETS.default`: 2 attempts with 500ms exponential backoff
  - `RETRY_PRESETS.aggressive`: 5 attempts with 1000ms exponential backoff
  - `RETRY_PRESETS.quick`: Single attempt with no delay
  - Example usage:

    ```typescript
    import { useTx, RETRY_PRESETS } from '@firsttx/tx';

    const { mutate } = useTx({
      retry: RETRY_PRESETS.default,
      // ...
    });
    ```

### Changed

- Updated README.md with retry preset documentation and examples

### Migration

No breaking changes. Existing code continues to work without modifications.

## 0.4.0

### Minor Changes

### ✨ Features

- **AbortSignal Support**: Step functions now optionally receive an `AbortSignal` parameter, enabling explicit cancellation of in-flight operations when timeout occurs ([#ce6230e](commit-hash))
  - Prevents resource waste from abandoned operations
  - Native integration with `fetch()` API
  - 100% backward compatible (signal parameter is optional)

### 🐛 Bug Fixes

- **Timeout Cancellation**: Fixed bug where operations continued running in background after timeout ([#ce6230e](commit-hash))
  - Previously, `Promise.race()` would reject but the losing promise continued executing
  - Now properly aborts ongoing operations via `AbortController`

### 🔄 Refactoring

- **SSR Compatibility**: Prevent crashes when using FirstTx in SSR framework client components ([#7c498ff](commit-hash))

### 📚 Documentation

- Added 6 new tests covering AbortSignal functionality
- Added 2 tests documenting the previous timeout bug behavior

### ⚠️ Breaking Changes

None. This release is fully backward compatible.

### 📦 Migration Guide

**Before (still works):**

```typescript
await tx.run(async () => {
  await fetch('/api/endpoint');
});
After (recommended):
await tx.run(async (signal) => {
  await fetch('/api/endpoint', { signal });
});

## 0.3.1

### Patch Changes

**Added**

- DevTools integration: added detailed event emission for transaction lifecycle debugging
  - `start` events: emitted when transaction begins with timeout and transition settings
  - `step.start` events: emitted when each step starts with compensation and retry configuration
  - `step.success` events: emitted on step completion with duration and attempt number
  - `step.retry` events: emitted on retry attempts with backoff strategy and delay details
  - `step.fail` events: emitted on step failures after exhausting retries
  - `commit` events: emitted on successful transaction commit with total duration
  - `rollback.start` events: emitted when rollback begins with failure reason and completed step count
  - `rollback.success` events: emitted on successful compensation with compensated step count
  - `rollback.fail` events: emitted when compensation fails with error details
  - `timeout` events: emitted when transaction exceeds configured timeout

**Changed**

- Internal: added `emitTxEvent()` calls throughout transaction execution flow
- No breaking changes to public API or `useTx` hook behavior

**Technical**

- Events use priority system (LOW for step details, NORMAL for lifecycle, HIGH for failures)
- All events include txId for correlation and debugging
- Step events include stepIndex for sequence tracking
- Retry events include backoff strategy information (exponential/linear)
- Events are gracefully no-op when DevTools extension is not present

## 0.3.0

### Minor Changes

BREAKING CHANGE: Error constructor signatures have changed

- Add TxError abstract base class with getUserMessage(), getDebugInfo(), and isRecoverable() methods
- Restructure RetryExhaustedError to store all attempt errors (not just last)
- Add stepId parameter to RetryExhaustedError for better debugging
- Add completedSteps to CompensationFailedError
- Add elapsedMs to TransactionTimeoutError
- Add TransactionStateError for invalid state transitions
- Replace generic Error throws with TransactionStateError in transaction.ts
- Update retry.ts to collect all errors and pass stepId
- Maintain backward-compatible error messages for existing tests

**Benefits**

- Consistent error handling across all transaction errors
- User-friendly messages suitable for UI display
- Detailed debug information for developers
- Clear recoverability flags for retry logic
- Better debugging with complete error history

**Migration**

- RetryExhaustedError: Use `errors` array instead of `lastError`
- Error checks: Can now use `instanceof TransactionStateError`
- All error classes expose `getUserMessage()`, `getDebugInfo()`, `isRecoverable()`

## 0.2.2

### Patch Changes

**Documentation**

- Fixed incorrect FAQ claiming "only fixed delay" for retries
- Documented exponential and linear backoff strategies with examples
- Added complete API Reference for `startTransaction`, `tx.run`, and `useTx`
- Included backoff comparison: exponential (100→200→400ms) vs linear (100→200→300ms)
- Added error handling section with `CompensationFailedError` and `TransactionTimeoutError`

## 0.2.1

### Patch Changes

- Add mutateAsync method to useTx hook for Promise-based API
- Support concurrent transaction execution with Promise.all/allSettled
- Add generic TResult type parameter for type-safe return values
- Fix isMountedRef initialization in useEffect for React 18 StrictMode
- Add test cases for mutateAsync scenarios

BREAKING CHANGE: UseTxConfig and UseTxResult now accept optional TResult generic parameter

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
```
