# @firsttx/tx

**Safe optimistic updates with atomic transactions**

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400068/firsttx-tx-01_blkctj.gif" />

Execute multi-step operations safely with automatic compensation on failure. Perfect for optimistic updates, API calls, and state synchronization.

```bash
npm install @firsttx/tx
```

[![npm version](https://img.shields.io/npm/v/@firsttx/tx.svg)](https://www.npmjs.com/package/@firsttx/tx)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## The Problem

```tsx
// ❌ Without transactions: Manual rollback hell
async function addToCart(item) {
  setCart((prev) => [...prev, item]); // Optimistic update

  try {
    await api.post('/cart', item);
  } catch (error) {
    setCart((prev) => prev.filter((i) => i.id !== item.id)); // Manual rollback
    toast.error('Failed to add item');
  }
}

// What if you have 5 steps? 10 steps?
// What if step 3 fails but step 2's rollback also fails?
```

---

## The Solution

```tsx
// ✅ With transactions: Automatic rollback
import { startTransaction } from '@firsttx/tx';

async function addToCart(item) {
  const tx = startTransaction({ transition: true });

  await tx.run(() => setCart((prev) => [...prev, item]), {
    compensate: () => setCart((prev) => prev.filter((i) => i.id !== item.id)),
  });

  await tx.run(() => api.post('/cart', item), { retry: { maxAttempts: 3 } });

  await tx.commit();
}

// Automatic rollback on ANY step failure
// ViewTransition support for smooth UI updates
// Built-in retry logic
```

---

## Quick Start

### Imperative API

```tsx
import { startTransaction } from '@firsttx/tx';

const tx = startTransaction({ transition: true });

// Step 1: Optimistic update with compensation
await tx.run(() => CartModel.patch((draft) => draft.items.push(item)), {
  compensate: () => CartModel.patch((draft) => draft.items.pop()),
});

// Step 2: Server request with retry
await tx.run(() => fetch('/api/cart', { method: 'POST', body: JSON.stringify(item) }), {
  retry: { maxAttempts: 3, delayMs: 1000 },
});

await tx.commit();
```

### React Hook API

```tsx
import { useTx } from '@firsttx/tx';

function AddToCartButton({ item }) {
  const { mutate, isPending, isError } = useTx({
    optimistic: async (item) => {
      await CartModel.patch((draft) => draft.items.push(item));
    },
    rollback: async (item) => {
      await CartModel.patch((draft) => {
        draft.items = draft.items.filter((i) => i.id !== item.id);
      });
    },
    request: async (item) => {
      return fetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify(item),
      }).then((r) => r.json());
    },
    retry: { maxAttempts: 3 },
    onSuccess: () => toast.success('Added to cart'),
    onError: (err) => toast.error(err.getUserMessage()),
  });

  return (
    <button onClick={() => mutate(item)} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

---

## Features

### Automatic Rollback

If any step fails, all completed steps are rolled back **in reverse order**.

```tsx
const tx = startTransaction();

await tx.run(() => step1(), { compensate: () => undo1() });
await tx.run(() => step2(), { compensate: () => undo2() });
await tx.run(() => step3(), { compensate: () => undo3() });

// If step3 fails:
// 1. Execute undo3 (if step3 started)
// 2. Execute undo2
// 3. Execute undo1
// 4. Re-throw original error
```

---

### Retry Logic

Exponential or linear backoff strategies.

```tsx
await tx.run(() => fetch('/api/data'), {
  retry: {
    maxAttempts: 3,
    delayMs: 100,
    backoff: 'exponential',
  },
});
```

**Retry Presets**

Use pre-configured retry strategies:

```tsx
import { RETRY_PRESETS } from '@firsttx/tx';

const { mutate } = useTx({
  optimistic: async () => {
    /* ... */
  },
  rollback: async () => {
    /* ... */
  },
  request: async () => {
    /* ... */
  },
  retry: RETRY_PRESETS.default,
});

const tx = startTransaction();
await tx.run(() => fetch('/api/data'), {
  retry: RETRY_PRESETS.aggressive,
});
```

**Available Presets:**

- `RETRY_PRESETS.default` - 2 attempts, 500ms delay, exponential backoff
- `RETRY_PRESETS.aggressive` - 5 attempts, 1000ms delay, exponential backoff
- `RETRY_PRESETS.quick` - 1 attempt, no delay, linear backoff

---

### ViewTransition Support

Smooth visual transitions during rollback.

```tsx
const tx = startTransaction({ transition: true });

// On rollback, changes are wrapped in document.startViewTransition()
// Provides smooth fade/slide animations
```

---

### Timeout Protection

Prevent transactions from hanging indefinitely.

```tsx
const tx = startTransaction({ timeout: 5000 }); // 5 second timeout

await tx.run(slowOperation); // If takes >5s, automatic rollback
```

---

## API Reference

### `startTransaction(options?)`

Creates a new transaction.

```typescript
startTransaction({
  id?: string,         // Custom ID (default: auto-generated UUID)
  transition?: boolean, // Use ViewTransition (default: false)
  timeout?: number     // Timeout in milliseconds (default: 30000)
});
```

---

### `tx.run(fn, options?)`

Executes a step with optional compensation and retry.

```typescript
await tx.run<T>(
  fn: () => Promise<T>,
  options?: {
    compensate?: () => Promise<void>,
    retry?: {
      maxAttempts?: number,
      delayMs?: number,
      backoff?: 'exponential' | 'linear'
    }
  }
);
```

**Parameters**

- `fn: () => Promise<T>` - Function to execute
- `options?.compensate: () => Promise<void>` - Rollback function (executed in reverse order on failure)
- `options?.retry: RetryConfig` - Retry configuration
  - `maxAttempts?: number` - Maximum retry attempts (default: `1`)
  - `delayMs?: number` - Base delay between retries in milliseconds (default: `100`)
  - `backoff?: 'exponential' | 'linear'` - Backoff strategy (default: `'exponential'`)

**Returns** `Promise<T>` - Result of the function

**Throws**

- `RetryExhaustedError` - When all retry attempts fail
- `TransactionTimeoutError` - When execution exceeds timeout

---

### `tx.commit()`

Finalizes the transaction.

```typescript
await tx.commit();
```

**After commit**

- Transaction becomes immutable
- No more steps can be added
- Cleanup tasks are executed

---

### `useTx<TVariables, TResult>(config)`

React hook for declarative transaction management.

```typescript
const { mutate, mutateAsync, isPending, isError, isSuccess, error } = useTx({
  optimistic: async (variables: TVariables) => { /* ... */ },
  rollback: async (variables: TVariables) => { /* ... */ },
  request: async (variables: TVariables) => { /* ... */ },
  transition?: boolean,
  retry?: RetryConfig,
  onSuccess?: (result: TResult, variables: TVariables) => void,
  onError?: (error: Error, variables: TVariables) => void
});
```

**Parameters**

- `config.optimistic: (variables: TVariables) => Promise<void>` - Immediate local update
- `config.rollback: (variables: TVariables) => Promise<void>` - Revert local update on failure
- `config.request: (variables: TVariables) => Promise<TResult>` - Server request
- `config.transition?: boolean` - Use ViewTransition (default: `true`)
- `config.retry?: RetryConfig` - Retry configuration
  - `maxAttempts?: number` - Default: `1`
  - `delayMs?: number` - Default: `100`
  - `backoff?: 'exponential' | 'linear'` - Default: `'exponential'`
- `config.onSuccess?: (result: TResult, variables: TVariables) => void` - Success callback
- `config.onError?: (error: Error, variables: TVariables) => void` - Error callback

**Returns**

- `mutate: (variables: TVariables) => void` - Fire-and-forget execution
- `mutateAsync: (variables: TVariables) => Promise<TResult>` - Promise-based execution
- `isPending: boolean` - Whether transaction is running
- `isError: boolean` - Whether transaction failed
- `isSuccess: boolean` - Whether transaction succeeded
- `error: Error | null` - Error object if failed

---

## Advanced Patterns

### Conditional Compensation

```tsx
let didUpdate = false;

await tx.run(
  async () => {
    if (needsUpdate) {
      updateData();
      didUpdate = true;
      await api.save();
    }
  },
  {
    compensate: async () => {
      if (didUpdate) revertData();
    },
  },
);
```

### Partial Rollback

```tsx
const completed: string[] = [];

await tx.run(
  async () => {
    await step1();
    completed.push('step1');
    await step2();
    completed.push('step2');
    await step3();
    completed.push('step3');
  },
  {
    compensate: async () => {
      for (const step of completed.reverse()) {
        await rollback(step);
      }
    },
  },
);
```

### External State Capture

```tsx
async function deleteItem(id: string) {
  const tx = startTransaction({ transition: true });

  const itemToDelete = items.find((i) => i.id === id);

  await tx.run(
    async () => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      await api.delete(id);
    },
    {
      compensate: async () => {
        setItems((prev) => [...prev, itemToDelete]);
      },
    },
  );

  await tx.commit();
}
```

---

## Error Handling

FirstTx provides structured error classes with user-friendly messages and debug information.

### Error Base Class

All transaction errors extend `TxError`:

```typescript
import { TxError } from '@firsttx/tx';

try {
  await tx.commit();
} catch (error) {
  if (error instanceof TxError) {
    // User-friendly message for UI
    alert(error.getUserMessage());

    // Detailed info for debugging
    console.error(error.getDebugInfo());

    // Check if retryable
    if (error.isRecoverable()) {
      // Offer retry option
    } else {
      // Suggest page refresh
    }
  }
}
```

---

### CompensationFailedError (Critical)

Thrown when rollback fails, indicating potential data inconsistency.

```typescript
import { CompensationFailedError } from '@firsttx/tx';

try {
  await tx.commit();
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error(`${error.failures.length} rollback(s) failed`);
    console.error(`Completed ${error.completedSteps} steps before failure`);

    // User message: "Failed to undo changes. Your data may be in an inconsistent state. Please refresh the page."
    alert(error.getUserMessage());

    // NOT recoverable - requires page refresh
    if (!error.isRecoverable()) {
      window.location.reload();
    }
  }
}
```

**Fields**

- `failures: Error[]` - All compensation errors (in reverse order)
- `completedSteps: number` - Number of steps that were completed

---

### RetryExhaustedError (Recoverable)

Thrown when a step fails after all retry attempts.

```typescript
import { RetryExhaustedError } from '@firsttx/tx';

try {
  await tx.run(apiCall, { retry: { maxAttempts: 3 } });
} catch (error) {
  if (error instanceof RetryExhaustedError) {
    console.log(`Step ${error.stepId} failed after ${error.attempts} attempts`);

    // Inspect all attempt errors
    error.errors.forEach((err, i) => {
      console.log(`Attempt ${i + 1}: ${err.message}`);
    });

    // User message: "The operation failed after 3 attempts. Please try again later."
    toast.error(error.getUserMessage(), {
      action: error.isRecoverable()
        ? {
            label: 'Retry',
            onClick: retryOperation,
          }
        : undefined,
    });
  }
}
```

**Fields**

- `stepId: string` - Step identifier (e.g., "step-0")
- `attempts: number` - Total number of attempts made
- `errors: Error[]` - All attempt errors (in chronological order)

---

### TransactionTimeoutError (Recoverable)

Thrown when transaction exceeds configured timeout.

```typescript
import { TransactionTimeoutError } from '@firsttx/tx';

try {
  const tx = startTransaction({ timeout: 5000 });
  await tx.run(slowOperation);
  await tx.commit();
} catch (error) {
  if (error instanceof TransactionTimeoutError) {
    console.log(`Timeout: ${error.timeoutMs}ms (elapsed: ${error.elapsedMs}ms)`);

    // User message: "The operation took too long (over 5000ms). Please try again."
    toast.error(error.getUserMessage());

    // Recoverable - can retry with longer timeout
    if (error.isRecoverable()) {
      const newTx = startTransaction({ timeout: 10000 });
      // ... retry with 10s timeout
    }
  }
}
```

**Fields**

- `timeoutMs: number` - Configured timeout value
- `elapsedMs: number` - Actual elapsed time before timeout

---

### TransactionStateError (Programming Error)

Thrown when attempting invalid operations (e.g., adding steps after commit).

```typescript
import { TransactionStateError } from '@firsttx/tx';

const tx = startTransaction();
await tx.commit();

try {
  await tx.run(() => {}); // Invalid!
} catch (error) {
  if (error instanceof TransactionStateError) {
    console.error(`Cannot ${error.attemptedAction} in state '${error.currentState}'`);
    console.error(`Transaction ID: ${error.transactionId}`);

    // User message: "This operation is no longer available. The transaction has already completed or failed."
    // NOT recoverable - indicates a bug
  }
}
```

**Fields**

- `currentState: string` - Current transaction status ("committed", "rolled-back", "failed")
- `attemptedAction: string` - What was attempted ("add step", "commit")
- `transactionId: string` - Transaction identifier

---

### Practical Error Handling Pattern

```typescript
import {
  TxError,
  CompensationFailedError,
  RetryExhaustedError,
  TransactionTimeoutError,
  TransactionStateError,
} from '@firsttx/tx';

async function handleTransaction() {
  try {
    const tx = startTransaction({ timeout: 5000 });

    await tx.run(() => updateUI(), { compensate: () => revertUI() });

    await tx.run(() => fetch('/api/update'), { retry: { maxAttempts: 3 } });

    await tx.commit();

    toast.success('Update successful');
  } catch (error) {
    if (error instanceof CompensationFailedError) {
      // Critical: data may be inconsistent
      alert(error.getUserMessage());
      window.location.reload();
    } else if (error instanceof RetryExhaustedError) {
      // Network issue: offer retry
      toast.error(error.getUserMessage(), {
        action: {
          label: 'Retry',
          onClick: () => handleTransaction(),
        },
      });
    } else if (error instanceof TransactionTimeoutError) {
      // Slow operation: suggest waiting
      toast.error(error.getUserMessage());
    } else if (error instanceof TransactionStateError) {
      // Programming error: log for debugging
      console.error(error.getDebugInfo());
      Sentry.captureException(error);
    } else if (error instanceof TxError) {
      // Generic TxError fallback
      toast.error(error.getUserMessage());
      console.error(error.getDebugInfo());
    }
  }
}
```

---

### Error Methods Reference

All transaction errors provide:

| Method             | Returns   | Purpose                                              |
| ------------------ | --------- | ---------------------------------------------------- |
| `getUserMessage()` | `string`  | User-friendly message for UI display                 |
| `getDebugInfo()`   | `string`  | Detailed technical information for debugging         |
| `isRecoverable()`  | `boolean` | Whether the error can be recovered from (retry-able) |

**Recoverability**

- ✅ `RetryExhaustedError`: Recoverable (network/temporary issues)
- ✅ `TransactionTimeoutError`: Recoverable (retry with longer timeout)
- ❌ `CompensationFailedError`: Not recoverable (data inconsistency)
- ❌ `TransactionStateError`: Not recoverable (programming error)

---

## Exports

```typescript
import {
  // Main API
  startTransaction,
  useTx,

  // Error Classes
  TxError, // Base class
  CompensationFailedError,
  RetryExhaustedError,
  TransactionTimeoutError,
  TransactionStateError,

  // Types
  type TxOptions,
  type TxStatus,
  type StepOptions,
  type RetryConfig,
  type UseTxConfig,
  type UseTxResult,

  // Constants
  DEFAULT_RETRY_CONFIG,
} from '@firsttx/tx';
```

---

## Constraints

### 1. No Nested Transactions

```tsx
// ❌ Not supported
const tx1 = startTransaction();
await tx1.run(async () => {
  const tx2 = startTransaction(); // Avoid this
  await tx2.run(...);
});
```

**Workaround** Use a single transaction with multiple steps.

---

### 2. Compensation Must Be Idempotent

Compensation functions may be called multiple times in edge cases.

```tsx
// ✅ Good: Idempotent compensation
compensate: () => {
  setCount(0); // Always safe to call multiple times
};

// ❌ Bad: Non-idempotent compensation
compensate: () => {
  setCount(count - 1); // Dangerous if called twice
};
```

---

### 3. Async Compensation Only

```tsx
// ❌ Sync compensation not supported
compensate: () => {
  updateState();
};

// ✅ Async compensation required
compensate: async () => {
  updateState();
};
```

---

## FAQ

**Q: What happens if compensation fails?**

A: `CompensationFailedError` is thrown with all failure details. The transaction is marked as `'failed'`, and you should handle it as a critical error (e.g., page refresh).

---

**Q: Can I retry a failed transaction?**

A: Yes, just call the same function again. Each transaction is independent.

---

**Q: What's the difference between `mutate` and `mutateAsync`?**

A:

- `mutate`: Fire-and-forget (no return value, errors caught internally)
- `mutateAsync`: Returns a Promise (allows `await`, errors bubble up)

---

**Q: Do I need to use ViewTransition?**

A: No, it's optional. Set `transition: false` to disable. ViewTransition provides smooth animations but requires browser support (Chrome 111+).

---

**Q: How does retry backoff work?**

A:

- **Exponential** (default): `100ms → 200ms → 400ms → 800ms` (delay × 2^attempt)
- **Linear**: `100ms → 200ms → 300ms → 400ms` (delay × attempt)

---

## Related Packages

- [`@firsttx/local-first`](https://www.npmjs.com/package/@firsttx/local-first) - IndexedDB + React integration
- [`@firsttx/prepaint`](https://www.npmjs.com/package/@firsttx/prepaint) - Instant page restoration

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
