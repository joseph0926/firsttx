# @firsttx/tx

**Safe optimistic updates with atomic transactions**

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400068/firsttx-tx-01_blkctj.gif" />

Automatic rollback on failure. Smooth transitions with ViewTransition. Framework-agnostic.

```bash
npm install @firsttx/tx
```

[![npm version](https://img.shields.io/npm/v/@firsttx/tx.svg)](https://www.npmjs.com/package/@firsttx/tx)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Basic Usage

```tsx
import { startTransaction } from '@firsttx/tx';

async function addToCart(item: Item) {
  const tx = startTransaction({ transition: true });

  await tx.run(
    async () => {
      setCart((prev) => [...prev, item]);
      await api.addItem(item);
    },
    {
      compensate: async () => {
        setCart((prev) => prev.filter((i) => i.id !== item.id));
      },
    },
  );

  await tx.commit();
}
```

**How it works**

1. `setCart` executes immediately (optimistic)
2. If `api.addItem` fails
3. `compensate` runs automatically (rollback)
4. Smooth transition with ViewTransition

---

## React Hook (useTx)

**Simplified API for React apps**

```tsx
import { useTx } from '@firsttx/tx';

function CartPage() {
  const { mutate, isPending, isError, error } = useTx({
    optimistic: async (item: Item) => {
      await CartModel.patch((draft) => {
        draft.items.push(item);
      });
    },
    rollback: async (item: Item) => {
      await CartModel.patch((draft) => {
        draft.items = draft.items.filter((i) => i.id !== item.id);
      });
    },
    request: async (item: Item) => {
      return fetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify(item),
      });
    },
    onSuccess: (result, item) => {
      toast.success('Added to cart!');
    },
    onError: (err, item) => {
      toast.error(err.message);
    },
  });

  return (
    <button onClick={() => mutate(newItem)} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

**Benefits**

- No manual transaction lifecycle management
- Built-in loading/error states
- Automatic cleanup on unmount
- Fire-and-forget API (no await needed)

---

## Retry with Backoff

**Low-level API**

```tsx
await tx.run(
  async () => {
    updateUI();
    await riskyApiCall();
  },
  {
    compensate: async () => revertUI(),
    retry: {
      maxAttempts: 3,
      delayMs: 1000,
      backoff: 'exponential', // or 'linear'
    },
  },
);
```

**useTx API**

```tsx
const { mutate } = useTx({
  optimistic: async (data) => updateUI(data),
  rollback: async (data) => revertUI(data),
  request: async (data) => riskyApiCall(data),
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: 'exponential',
  },
});
```

**Backoff Strategies**

- `exponential` (default): 100ms → 200ms → 400ms → 800ms (delay × 2^attempt)
- `linear`: 100ms → 200ms → 300ms → 400ms (delay × attempt)

**Note** Retry applies only to the `request` step. Optimistic updates don't retry since they're local operations.

---

## Multi-Step Transaction

```tsx
async function checkout(cartId: string) {
  const tx = startTransaction({ transition: true });

  let orderId: string;

  await tx.run(
    async () => {
      const order = await api.orders.create(cartId);
      orderId = order.id;
      setState('order-created');
    },
    {
      compensate: async () => {
        setState('idle');
        await api.orders.cancel(orderId);
      },
    },
  );

  await tx.run(
    async () => {
      await api.payments.charge(orderId);
      setState('paid');
    },
    {
      compensate: async () => {
        setState('order-created');
        await api.payments.refund(orderId);
      },
    },
  );

  await tx.run(
    async () => {
      await api.cart.clear(cartId);
      navigate(`/orders/${orderId}`);
    },
    {
      compensate: async () => setState('paid'),
    },
  );

  await tx.commit();
}
```

**On failure** Automatic rollback in reverse order (Step 3 → 2 → 1)

---

## ViewTransition

```tsx
const tx = startTransaction({ transition: true });
```

**Browser support**

- Chrome 111+: Full support
- Firefox/Safari: Auto-fallback (instant rollback)

**Custom animations**

```css
::view-transition-old(root) {
  animation: fade-out 300ms;
}

::view-transition-new(root) {
  animation: fade-in 300ms;
}
```

---

## API Reference

### `startTransaction(options?)`

Creates a new transaction instance.

```typescript
const tx = startTransaction({
  id?: string,           // Custom transaction ID (default: auto-generated)
  transition?: boolean,  // Use ViewTransition (default: false)
  timeout?: number       // Overall timeout in ms (default: 30000)
});
```

**Options**

- `id?: string` - Custom transaction identifier for debugging
- `transition?: boolean` - Enable smooth ViewTransition animations (default: `false`)
- `timeout?: number` - Maximum total execution time in milliseconds (default: `30000`)

**Returns** `Transaction` instance

---

### `tx.run(fn, options?)`

Executes a step within the transaction.

```typescript
await tx.run(
  async () => {
    // Your logic
  },
  {
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

### Execution Failure (auto-recovery)

```tsx
await tx.run(
  async () => {
    throw new Error('API failed');
  },
  {
    compensate: async () => {
      console.log('Auto-rolled back');
    },
  },
);
```

If `compensate` succeeds → original error is re-thrown

### Compensation Failure (critical)

```tsx
import { CompensationFailedError } from '@firsttx/tx';

try {
  await tx.commit();
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('Rollback failed:', error.failures);
  }
}
```

### Timeout

```tsx
import { TransactionTimeoutError } from '@firsttx/tx';

try {
  const tx = startTransaction({ timeout: 5000 });
  await tx.run(slowOperation);
  await tx.commit();
} catch (error) {
  if (error instanceof TransactionTimeoutError) {
    console.error('Transaction exceeded 5s timeout');
  }
}
```

---

## Constraints

### 1. Compensate functions must not fail

```tsx
// ❌ Risky
compensate: async () => {
  await riskyOperation();
};

// ✅ Safe
compensate: async () => {
  try {
    await riskyOperation();
  } catch {
    await safeFallback();
  }
};
```

### 2. Immutable after commit

```tsx
await tx.commit();

// ❌ Error
await tx.run(async () => {
  /* ... */
});
```

### 3. Compensation runs in reverse order automatically

```tsx
await tx.run(step1, { compensate: undo1 }); // 1
await tx.run(step2, { compensate: undo2 }); // 2
await tx.run(step3, { compensate: undo3 }); // 3

// If step3 fails: undo3 → undo2 → undo1
```

---

## FAQ

**Q: Difference from React Query?**

A: They're complementary. Tx is framework-agnostic and can be used inside React Query.

```tsx
const mutation = useMutation({
  mutationFn: async (data) => {
    const tx = startTransaction();
    await tx.run(/* ... */);
    await tx.commit();
  },
});
```

---

**Q: Nested transactions?**

A: Each transaction is independent.

```tsx
const parent = startTransaction();
await parent.run(
  async () => {
    const child = startTransaction();
    await child.run(/* ... */);
    await child.commit();
  },
  { compensate: /* parent compensation */ }
);
```

---

**Q: What backoff strategies are supported?**

A: Built-in support for exponential (default) and linear backoff.

```tsx
// Exponential (100ms → 200ms → 400ms)
retry: { maxAttempts: 3, delayMs: 100, backoff: 'exponential' }

// Linear (100ms → 200ms → 300ms)
retry: { maxAttempts: 3, delayMs: 100, backoff: 'linear' }
```

---

## Changelog

### [0.2.1](https://github.com/joseph0926/firsttx/releases/tag/%40firsttx%2Ftx%400.2.1) - 2025-01-15

**Added**

- `mutateAsync` alias for promise-based execution in `useTx`

### [0.1.1](https://github.com/joseph0926/firsttx/releases/tag/%40firsttx%2Ftx%400.1.1) - 2025-01-13

**Added**

- Transaction timeout mechanism using Promise.race()
- Proper 'failed' status when compensation fails

**Improved**

- Comprehensive test coverage for timeout scenarios
- Accurate reflection of final transaction state

---

## Related Packages

- [`@firsttx/local-first`](https://www.npmjs.com/package/@firsttx/local-first) - IndexedDB models
- [`@firsttx/prepaint`](https://www.npmjs.com/package/@firsttx/prepaint) - Instant restoration

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
