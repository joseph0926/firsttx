# Tx

## What is Tx?

Tx is a library that manages optimistic updates as transactions. It groups multiple steps into a single transaction and automatically rolls them back on failure.

Key features:

- Supports safe rollback with step-by-step execution and compensate functions
- Recovers from transient failures automatically with retry settings
- Prevents indefinite waiting with timeouts
- Provides smooth UI transitions on rollback by using the ViewTransition API

## startTransaction

Starts a transaction.

```typescript
import { startTransaction } from '@firsttx/tx';

const tx = startTransaction();

// Step 1: Update local model (optimistic update)
await tx.run(
  () => CartModel.patch((draft) => {
    draft.items.push(newItem);
  }),
  {
    compensate: () => CartModel.patch((draft) => {
      draft.items.pop();
    }),
  }
);

// Step 2: Server request
await tx.run(() => fetch('/api/cart', {
  method: 'POST',
  body: JSON.stringify(newItem),
}));

// Commit
await tx.commit();
```

### TxOptions

Options that can be passed to `startTransaction`.

| Option       | Type      | Default             | Description                                                                                  |
| ------------ | --------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `id`         | `string`  | Auto-generated UUID | Transaction identifier. Useful for debugging.                                                |
| `transition` | `boolean` | `false`             | Uses the ViewTransition API on rollback                                                      |
| `timeout`    | `number`  | `30000`             | Timeout for the entire transaction in ms. A `TransactionTimeoutError` is thrown if exceeded. |

```typescript
const tx = startTransaction({
  id: 'cart-update-123',
  transition: true,
  timeout: 10000, // 10 seconds
});
```

## tx.run

Adds a step to the transaction and executes it.

```typescript
const result = await tx.run(
  async (signal) => {
    // signal is an AbortSignal
    const res = await fetch('/api/data', { signal });
    return res.json();
  },
  {
    compensate: async () => {
      // Executed on rollback
    },
    retry: {
      maxAttempts: 3,
      delayMs: 500,
      backoff: 'exponential',
    },
  }
);
```

### StepOptions

| Option       | Type                  | Description                                                                                |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------ |
| `compensate` | `() => Promise<void>` | Function executed on rollback. Called when this step has succeeded and a later step fails. |
| `retry`      | `RetryConfig`         | Retry configuration                                                                        |

### AbortSignal

`tx.run` receives an `AbortSignal` as its first argument. It is aborted on timeout or cancellation.

```typescript
await tx.run(async (signal) => {
  // Pass signal to fetch
  const res = await fetch('/api/slow', { signal });

  // Manual cancellation check
  if (signal?.aborted) {
    throw new Error('Cancelled');
  }

  return res.json();
});
```

## tx.commit

Completes the transaction. Call this after all steps have succeeded.

```typescript
await tx.commit();
```

Calling `commit()` again on an already committed transaction is ignored. Calling `commit()` on a rolled-back or failed transaction throws a `TransactionStateError`.

## Rollback behavior

When an error occurs in any step, rollback is triggered automatically.

1. Detects the error in the current step.
2. Executes the `compensate` functions of previously successful steps in reverse order.
3. After all compensate functions complete, rethrows the original error.

```typescript
const tx = startTransaction();

// Step 1: Success
await tx.run(
  () => step1(),
  { compensate: () => undoStep1() }
);

// Step 2: Success
await tx.run(
  () => step2(),
  { compensate: () => undoStep2() }
);

// Step 3: Failure!
await tx.run(() => step3()); // Error occurs

// Rollback order: undoStep2() → undoStep1()
```

### What if a compensate function fails?

Even if a compensate function fails, the remaining compensate functions continue to execute. After all compensate attempts, a `CompensationFailedError` is thrown.

```typescript
try {
  await tx.run(() => failingStep());
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('An error occurred during rollback:', error.failures);
    // Data may be in an inconsistent state
  }
}
```

## Retry

You can configure automatic retries for transient issues such as network errors.

### RetryConfig

| Option        | Type                        | Default         | Description                                   |
| ------------- | --------------------------- | --------------- | --------------------------------------------- |
| `maxAttempts` | `number`                    | `1`             | Maximum number of attempts. 1 means no retry. |
| `delayMs`     | `number`                    | `100`           | Delay between retries in ms                   |
| `backoff`     | `'linear' \| 'exponential'` | `'exponential'` | Strategy for increasing the wait time         |

### Backoff strategies

- `linear`: `delayMs × attemptCount` (e.g. 100, 200, 300, ...)
- `exponential`: `delayMs × 2^(attempt-1)` (e.g. 100, 200, 400, 800, ...)

```typescript
await tx.run(
  () => fetch('/api/flaky'),
  {
    retry: {
      maxAttempts: 3,
      delayMs: 500,
      backoff: 'exponential', // 500ms, 1000ms, 2000ms
    },
  }
);
```

### RETRY_PRESETS

Frequently used retry configurations are predefined.

```typescript
import { RETRY_PRESETS } from '@firsttx/tx';

// default: 2 attempts, 500ms initial delay, exponential backoff
await tx.run(fn, { retry: RETRY_PRESETS.default });

// aggressive: 5 attempts, 1000ms initial delay, exponential backoff
await tx.run(fn, { retry: RETRY_PRESETS.aggressive });

// quick: 1 attempt (no retry), 0ms
await tx.run(fn, { retry: RETRY_PRESETS.quick });
```

## useTx

A React hook that makes it easy to use transactions in components.

```typescript
import { useTx } from '@firsttx/tx';

function AddToCartButton({ item }) {
  const { mutate, isPending, isError, error } = useTx({
    optimistic: async () => {
      await CartModel.patch((draft) => {
        draft.items.push(item);
      });
    },
    rollback: async () => {
      await CartModel.patch((draft) => {
        draft.items.pop();
      });
    },
    request: async () => {
      const res = await fetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (result) => {
      console.log('Added successfully:', result);
    },
    onError: (error) => {
      console.error('Failed to add:', error);
    },
  });

  return (
    <button onClick={() => mutate(item)} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add to cart'}
    </button>
  );
}
```

### UseTxConfig

| Option            | Type                                              | Required | Description                                                                         |
| ----------------- | ------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `optimistic`      | `(variables: T) => Promise<S>`                    | Yes      | Optimistic update function. Its return value is passed to `rollback` as `snapshot`. |
| `rollback`        | `(variables: T, snapshot?: S) => Promise<void>`   | Yes      | Rollback function. Receives the value returned from `optimistic` as `snapshot`.     |
| `request`         | `(variables: T) => Promise<R>`                    | Yes      | Server request function                                                             |
| `transition`      | `boolean`                                         | No       | Whether to use ViewTransition                                                       |
| `retry`           | `RetryConfig`                                     | No       | Retry configuration for the `request` step                                          |
| `onSuccess`       | `(result: R, variables: T, snapshot?: S) => void` | No       | Success callback                                                                    |
| `onError`         | `(error: Error, variables: T) => void`            | No       | Failure callback                                                                    |
| `cancelOnUnmount` | `boolean`                                         | No       | Whether to cancel the transaction when the component unmounts                       |

### Return value

| Field         | Type                           | Description                                  |
| ------------- | ------------------------------ | -------------------------------------------- |
| `mutate`      | `(variables: T) => void`       | Executes the transaction (fire-and-forget)   |
| `mutateAsync` | `(variables: T) => Promise<R>` | Executes the transaction (returns a Promise) |
| `cancel`      | `() => void`                   | Cancels the ongoing transaction              |
| `isPending`   | `boolean`                      | Whether the transaction is in progress       |
| `isError`     | `boolean`                      | Whether an error has occurred                |
| `isSuccess`   | `boolean`                      | Whether it has succeeded                     |
| `error`       | `Error \| null`                | Error object                                 |

### Using snapshot

The value returned by `optimistic` is passed to `rollback` as `snapshot`. You can store the previous state and use it in rollback.

```typescript
const { mutate } = useTx({
  optimistic: async (newName) => {
    const previousName = user.name;
    await UserModel.patch((draft) => {
      draft.name = newName;
    });
    return previousName; // Passed as snapshot
  },
  rollback: async (_, previousName) => {
    await UserModel.patch((draft) => {
      draft.name = previousName; // Restore previous value
    });
  },
  request: (newName) => updateUser(newName),
});
```

## Transaction states

A transaction can be in one of the following states:

| State         | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `pending`     | Immediately after creation; `run()` has not yet been called |
| `running`     | `run()` is in progress                                      |
| `committed`   | `commit()` has completed                                    |
| `rolled-back` | Rollback has completed                                      |
| `failed`      | Inconsistent state due to failed compensate operations      |

`running` means a step is currently executing. Call the next `run()` only after the current step finishes (await it).
Concurrent `run()` calls will throw a `TransactionStateError`.

## Error handling

### TransactionTimeoutError

Occurs when a transaction exceeds the configured timeout.

```typescript
const tx = startTransaction({ timeout: 5000 });

try {
  await tx.run(() => slowOperation());
} catch (error) {
  if (error instanceof TransactionTimeoutError) {
    console.log(`Timeout: exceeded ${error.timeoutMs}ms`);
  }
}
```

### RetryExhaustedError

Occurs when all retry attempts have been exhausted.

```typescript
try {
  await tx.run(fn, { retry: { maxAttempts: 3 } });
} catch (error) {
  if (error instanceof RetryExhaustedError) {
    console.log(`Failed after ${error.attempts} attempt(s)`);
    console.log('Errors for each attempt:', error.errors);
  }
}
```

### CompensationFailedError

Occurs when a compensate function fails during rollback. Because the data may be inconsistent, you should handle this carefully.

```typescript
try {
  await tx.run(fn);
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('Rollback failed! Data may be inconsistent');
    console.log('Number of failed compensate calls:', error.failures.length);
    // It is recommended to ask the user to refresh the page
  }
}
```

### TransactionStateError

Occurs when an operation is attempted in an invalid transaction state.

```typescript
const tx = startTransaction();
await tx.run(fn);
await tx.commit();

// Attempting run() on an already committed transaction
await tx.run(anotherFn); // TransactionStateError
```

For detailed error types, refer to `errors.md`.
