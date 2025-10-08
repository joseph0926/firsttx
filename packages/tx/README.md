# @firsttx/tx

**Atomic transactions for optimistic UI updates.**

Turn optimistic mutations and server effects into a single **atomic transaction** with automatic rollback, retry logic, and optional ViewTransition wrapping. Ensures UI and data stay consistent even when operations fail.

[![npm version](https://img.shields.io/npm/v/@firsttx/tx.svg)](https://www.npmjs.com/package/@firsttx/tx)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Features

- ✅ **Atomic Semantics:** All-or-nothing execution (like SQL transactions)
- ✅ **Auto Rollback:** Failed steps trigger automatic compensation (reverse order)
- ✅ **Network Retry:** Built-in retry for transient errors (configurable)
- ✅ **ViewTransition:** Smooth UI animations during sync/rollback
- ✅ **Type Safe:** Full TypeScript support with detailed error types
- ✅ **Zero Dependencies:** Lightweight and framework-agnostic

---

## Installation

```bash
pnpm add @firsttx/tx

# Works great with @firsttx/local-first
pnpm add @firsttx/local-first
```

**Requirements:**

- Node.js 18+
- Modern browser
- ViewTransition API (Chrome 111+) for smooth animations (optional, gracefully degrades)

---

## Quick Start

### Basic Transaction

```ts
import { startTransaction } from '@firsttx/tx';

async function updateProfile(userId: string, newName: string) {
  const tx = startTransaction();

  // Step 1: Update UI optimistically
  await tx.run(async () => {
    await UserModel.patch((draft) => {
      draft.name = newName;
    });
  });

  // Step 2: Sync with server
  await tx.run(async () => {
    await api.updateUser(userId, { name: newName });
  });

  await tx.commit();
}
```

### With Compensation (Rollback)

```ts
import { startTransaction } from '@firsttx/tx';

async function addToCart(product: { id: string; name: string; price: number }) {
  const tx = startTransaction({ transition: true });

  try {
    // Step 1: Optimistic update with rollback
    await tx.run(
      async () => {
        await CartModel.patch((draft) => {
          const existing = draft.items.find((item) => item.id === product.id);
          if (existing) {
            existing.qty += 1;
          } else {
            draft.items.push({ ...product, qty: 1 });
          }
          draft.updatedAt = Date.now();
        });
      },
      {
        compensate: async () => {
          await CartModel.patch((draft) => {
            const item = draft.items.find((i) => i.id === product.id);
            if (item) {
              item.qty -= 1;
              if (item.qty <= 0) {
                draft.items = draft.items.filter((i) => i.id !== product.id);
              }
            }
          });
        },
      },
    );

    // Step 2: Server confirmation with retry
    await tx.run(() => api.post('/cart/add', { id: product.id }), {
      retry: { maxAttempts: 3, delayMs: 200, backoff: 'exponential' },
    });

    // Step 3: Success notification
    await tx.run(() => {
      toast.success('Added to cart!');
      return Promise.resolve();
    });

    await tx.commit();
  } catch (error) {
    // Auto rollback already happened
    toast.error('Failed to add item');
    console.error(error);
  }
}
```

### Complex Multi-Step Transaction

```ts
async function checkout(cartItems: CartItem[]) {
  const tx = startTransaction({
    id: 'checkout-flow',
    transition: true,
    timeout: 30000, // 30 seconds
  });

  try {
    // Step 1: Validate inventory
    await tx.run(() => api.validateInventory(cartItems));

    // Step 2: Process payment
    await tx.run(() => api.chargePayment(total), {
      retry: { maxAttempts: 3, delayMs: 500 },
      compensate: () => api.refundPayment(chargeId),
    });

    // Step 3: Create order
    await tx.run(() => api.createOrder(orderData), {
      compensate: () => api.cancelOrder(orderId),
    });

    // Step 4: Update local state
    await tx.run(() => {
      CartModel.replace({ items: [], updatedAt: Date.now() });
      OrderModel.patch((draft) => {
        draft.orders.unshift(newOrder);
      });
      return Promise.resolve();
    });

    await tx.commit();
    router.navigate('/order-confirmation');
  } catch (error) {
    // All steps rolled back
    toast.error('Checkout failed. Please try again.');
  }
}
```

---

## API Reference

### `startTransaction(options?)`

Creates a new transaction.

**Parameters:**

- `options?` - `id?` (string): Custom transaction identifier (auto-generated if omitted)
  - `transition?` (boolean): Wrap rollback in ViewTransition (default: `false`)
  - `timeout?` (number): Overall transaction timeout in milliseconds

**Returns:** `Transaction`

**Example:**

```ts
const tx = startTransaction({
  id: 'user-profile-update',
  transition: true,
  timeout: 10000,
});
```

---

### `transaction.run(fn, options?)`

Adds and immediately executes a step in the transaction.

**Parameters:**

- `fn` (() => Promise<void>): Async function to execute
- `options?` - `compensate?` (() => Promise<void>): Rollback function (runs in reverse order)
  - `retry?`: Retry configuration
    - `maxAttempts?` (number): Maximum retry attempts (default: `1`)
    - `delayMs?` (number): Delay between retries (default: `100`)
    - `backoff?` ('linear' | 'exponential'): Retry strategy (default: `'exponential'`)

**Returns:** `Promise<void>`

**Throws:** If step fails after retries, triggers automatic rollback

**Example:**

```ts
await tx.run(
  async () => {
    await api.updateProfile(data);
  },
  {
    compensate: async () => {
      await api.updateProfile(previousData);
    },
    retry: { maxAttempts: 3, delayMs: 200, backoff: 'exponential' },
  },
);
```

---

### `transaction.commit()`

Finalizes the transaction. Idempotent (safe to call multiple times).

**Returns:** `Promise<void>`

**Example:**

```ts
await tx.commit();
console.log('Transaction completed successfully');
```

---

## Types

### `RetryConfig`

```ts
type RetryConfig = {
  maxAttempts?: number; // default: 1
  delayMs?: number; // default: 100
  backoff?: 'linear' | 'exponential'; // default: 'exponential'
};
```

### `StepOptions`

```ts
type StepOptions = {
  compensate?: () => Promise<void>;
  retry?: RetryConfig;
};
```

### `TxOptions`

```ts
type TxOptions = {
  id?: string;
  transition?: boolean;
  timeout?: number;
};
```

### `TxStatus`

```ts
type TxStatus =
  | 'pending' // Created but no steps run
  | 'running' // Steps are executing
  | 'committed' // Successfully completed
  | 'rolled-back' // Failed and compensated
  | 'failed'; // Compensation also failed
```

---

## Error Handling

### `CompensationFailedError`

Thrown when rollback (compensation) fails. Contains all individual failures.

```ts
import { CompensationFailedError } from '@firsttx/tx';

try {
  await tx.run(failingStep);
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('Rollback failed:', error.failures);
    // error.failures: Error[]
  }
}
```

### `RetryExhaustedError`

Thrown when all retry attempts fail.

```ts
import { RetryExhaustedError } from '@firsttx/tx';

try {
  await tx.run(flakeyApi, { retry: { maxAttempts: 5 } });
} catch (error) {
  if (error instanceof RetryExhaustedError) {
    console.error('Max retries reached:', error.attempts);
    console.error('Last error:', error.lastError);
  }
}
```

### `TransactionTimeoutError`

Thrown when transaction exceeds timeout.

```ts
import { TransactionTimeoutError } from '@firsttx/tx';

try {
  const tx = startTransaction({ timeout: 5000 });
  await tx.run(slowOperation);
} catch (error) {
  if (error instanceof TransactionTimeoutError) {
    console.error('Transaction timed out after:', error.timeoutMs);
  }
}
```

---

## Design Decisions

### Why Default Retry = 1?

**Philosophy:** Provide safe defaults for all users.

- Not everyone uses React Query or Axios with retry
- Handles transient network glitches (WiFi reconnect, DNS hiccup)
- Prevents server overload with exponential backoff
- Easily disabled: `retry: { maxAttempts: 0 }`

**Future:** Smart filtering (retry 5xx/network, skip 4xx)

### Why Auto Rollback?

**Philosophy:** Transactions should be atomic.

- Matches database semantics (BEGIN → COMMIT/ROLLBACK)
- Eliminates manual cleanup boilerplate
- Guarantees UI consistency
- ViewTransition makes it smooth

### Why Compensate Failures Throw?

**Philosophy:** Rollback is the last safety net.

- Prevents infinite retry loops
- Forces developer awareness
- Provides detailed error context
- Better than silent failure

**Behavior:**

1. All compensations attempted (even after failures)
2. Errors collected
3. `CompensationFailedError` thrown with all failures

---

## Best Practices

### ✅ DO

- **Define compensate for state-changing operations**
- **Use retry for network requests** (not for business logic errors)
- **Keep steps small and focused** (easier to reason about rollback)
- **Enable `transition: true`** for better UX during rollback
- **Set timeouts for long-running operations**
- **Make compensations idempotent** (safe to run multiple times)

### ❌ DON'T

- **Don't nest transactions** (not supported)
- **Don't share state between steps** without proper handling
- **Don't use retry for validation errors** (4xx should fail fast)
- **Don't forget error handling** in calling code
- **Don't make assumptions about step order** (they run sequentially)

---

## Patterns

### Pattern 1: Optimistic Update + Server Confirm

```ts
async function updateQuantity(itemId: string, delta: number) {
  const tx = startTransaction({ transition: true });

  const previousQty = cart.items.find((i) => i.id === itemId)?.qty ?? 0;

  await tx.run(
    () =>
      CartModel.patch((d) => {
        const item = d.items.find((i) => i.id === itemId);
        if (item) item.qty += delta;
      }),
    {
      compensate: () =>
        CartModel.patch((d) => {
          const item = d.items.find((i) => i.id === itemId);
          if (item) item.qty = previousQty;
        }),
    },
  );

  await tx.run(() => api.updateQuantity(itemId, delta), {
    retry: { maxAttempts: 3 },
  });

  await tx.commit();
}
```

### Pattern 2: Multi-Resource Update

```ts
async function transferItem(fromListId: string, toListId: string, itemId: string) {
  const tx = startTransaction();

  const item = lists[fromListId].find((i) => i.id === itemId);

  await tx.run(
    () =>
      ListModel.patch((d) => {
        d[fromListId] = d[fromListId].filter((i) => i.id !== itemId);
        d[toListId].push(item);
      }),
    {
      compensate: () =>
        ListModel.patch((d) => {
          d[toListId] = d[toListId].filter((i) => i.id !== itemId);
          d[fromListId].push(item);
        }),
    },
  );

  await tx.run(() => api.moveItem(fromListId, toListId, itemId));

  await tx.commit();
}
```

### Pattern 3: Conditional Steps

```ts
async function processPayment(amount: number, useCredit: boolean) {
  const tx = startTransaction();

  if (useCredit) {
    await tx.run(
      () =>
        CreditModel.patch((d) => {
          d.balance -= amount;
        }),
      {
        compensate: () =>
          CreditModel.patch((d) => {
            d.balance += amount;
          }),
      },
    );
  }

  await tx.run(() => api.charge(amount));

  await tx.commit();
}
```

---

## Performance Tips

1. **Batch updates:** Group related changes in one step
2. **Avoid unnecessary compensations:** Only add for state changes
3. **Use ViewTransition selectively:** Not needed for every transaction
4. **Set reasonable timeouts:** Prevent hanging transactions
5. **Monitor retry counts:** High retries = underlying issue

---

## Troubleshooting

### Q: Why is my rollback not working?

**A:** Check that

1. `compensate` function is defined
2. Compensation logic is inverse of the step
3. No errors are thrown in compensation

### Q: Can I add steps after commit?

**A:** No. Once committed, the transaction is finalized. Create a new transaction.

### Q: What happens if compensate fails?

**A:** `CompensationFailedError` is thrown with all failure details. This is **intentional** to prevent silent data corruption.

### Q: How do I disable retry?

**A:** `retry: { maxAttempts: 0 }`

### Q: Can I use Tx without React?

**A:** Yes! Tx is framework-agnostic. Works with any async operations.

---

## Examples

See the [demo app](../../apps/demo) for complete examples

- **Cart Page:** Add/remove items with rollback
- **Products Page:** Optimistic product creation
- **Error Simulation:** Toggle server failures

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Related Packages

- [`@firsttx/local-first`](../local-first) - IndexedDB models for React
- `@firsttx/prepaint` _(coming soon)_ - Instant Replay

---

## Links

- [GitHub Repository](https://github.com/joseph0926/firsttx)
- [Issue Tracker](https://github.com/joseph0926/firsttx/issues)
- [Main Documentation](../../README.md)
