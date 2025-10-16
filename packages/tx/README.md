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
      // Optimistic update
      setCart((prev) => [...prev, item]);
      // Server request
      await api.addItem(item);
    },
    {
      // Auto-executed on failure
      compensate: async () => {
        setCart((prev) => prev.filter((i) => i.id !== item.id));
      },
    },
  );

  await tx.commit();
}
```

**How it works:**

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

**Benefits:**

- No manual transaction lifecycle management
- Built-in loading/error states
- Automatic cleanup on unmount
- Fire-and-forget API (no await needed)

---

## Retry

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

**Note:** Retry applies only to the `request` step. Optimistic updates don't retry since they're local operations.

---

## Multi-Step Transaction

```tsx
async function checkout(cartId: string) {
  const tx = startTransaction({ transition: true });

  let orderId: string;

  // Step 1: Create order
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

  // Step 2: Payment
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

  // Step 3: Complete
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

**On failure:** Automatic rollback in reverse order (Step 3 → 2 → 1)

---

## ViewTransition

```tsx
// transition: true → smooth rollback
const tx = startTransaction({ transition: true });

// transition: false (default) → instant rollback
const tx = startTransaction();
```

**Browser support:**

- Chrome 111+: Full support
- Firefox/Safari: Auto-fallback (instant rollback)

**Custom animations:**

```css
::view-transition-old(root) {
  animation: fade-out 300ms;
}

::view-transition-new(root) {
  animation: fade-in 300ms;
}
```

---

## API

### `startTransaction(options?)`

```typescript
const tx = startTransaction({
  transition?: boolean  // Use ViewTransition (default: false)
});
```

### `tx.run(fn, options?)`

```typescript
await tx.run(
  fn: () => Promise<void>,
  {
    compensate?: () => Promise<void>,
    retry?: {
      maxAttempts?: number,  // default: 1
      delay?: number          // default: 1000ms
    }
  }
);
```

### `tx.commit()`

```typescript
await tx.commit(); // Finalize transaction
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
// If compensate succeeds → original error is re-thrown
```

### Compensation Failure (critical)

```tsx
import { CompensationFailedError } from '@firsttx/tx';

try {
  await tx.commit();
} catch (error) {
  if (error instanceof CompensationFailedError) {
    // Data consistency broken
    console.error('Rollback failed:', error.failures);
  }
}
```

### `useTx(config)`

React hook for optimistic updates.

```typescript
const { mutate, isPending, isError, isSuccess, error } = useTx({
  optimistic: (variables) => Promise<void>,
  rollback: (variables) => Promise<void>,
  request: (variables) => Promise<unknown>,
  transition?: boolean,
  retry?: {
    maxAttempts?: number,
    delayMs?: number,
    backoff?: 'linear' | 'exponential',
  },
  onSuccess?: (result, variables) => void,
  onError?: (error, variables) => void,
});
```

**Parameters**

- `optimistic` - Function to update local state
- `rollback` - Function to revert local state on failure
- `request` - Server request function
- `transition` - Enable ViewTransition (default: `true`)
- `retry` - Retry configuration for request step
- `onSuccess` - Success callback
- `onError` - Error callback

**Returns**

- `mutate(variables)` - Trigger the transaction (void return)
- `isPending` - Whether transaction is in progress
- `isError` - Whether transaction failed
- `isSuccess` - Whether transaction succeeded
- `error` - Error object if failed

**Notes**

- `mutate()` returns `void` (fire-and-forget)
- Use callbacks (`onSuccess`/`onError`) for side effects
- Automatically prevents state updates after unmount
- Retry applies only to the `request` step, not `optimistic`

---

## Real-World Examples

### Shopping Cart

```tsx
// Add item
async function addItem(product: Product, qty: number) {
  const tx = startTransaction({ transition: true });
  const newItem = { id: crypto.randomUUID(), ...product, qty };

  await tx.run(
    async () => {
      patch((draft) => {
        draft.items.push(newItem);
        draft.total += product.price * qty;
      });
      await api.cart.add(newItem);
    },
    {
      compensate: async () => {
        patch((draft) => {
          draft.items = draft.items.filter((i) => i.id !== newItem.id);
          draft.total -= product.price * qty;
        });
      },
    },
  );

  await tx.commit();
}

// Update quantity
async function updateQty(itemId: string, newQty: number) {
  const tx = startTransaction({ transition: true });
  const item = cart.items.find((i) => i.id === itemId);
  const oldQty = item.qty;
  const diff = newQty - oldQty;

  await tx.run(
    async () => {
      patch((draft) => {
        item.qty = newQty;
        draft.total += item.price * diff;
      });
      await api.cart.updateQty(itemId, newQty);
    },
    {
      compensate: async () => {
        patch((draft) => {
          item.qty = oldQty;
          draft.total -= item.price * diff;
        });
      },
    },
  );

  await tx.commit();
}
```

### Collaborative Document

```tsx
async function applyEdit(docId: string, edit: Edit) {
  const tx = startTransaction({ transition: true });
  const snapshot = captureSnapshot(docId);

  await tx.run(
    async () => {
      applyEditLocally(docId, edit);
      await api.docs.sync(docId, edit);
    },
    {
      compensate: async () => {
        restoreSnapshot(docId, snapshot);
      },
      retry: { maxAttempts: 3 },
    },
  );

  await tx.commit();
}
```

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

  // Capture via closure
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
    // Child transaction
    const child = startTransaction();
    await child.run(/* ... */);
    await child.commit();
  },
  { compensate: /* parent compensation */ }
);
```

---

**Q: Exponential backoff for retries?**

A: Currently only fixed delay. Implement manually if needed:

```tsx
for (let i = 0; i < maxAttempts; i++) {
  try {
    await tx.run(fn);
    break;
  } catch {
    await delay(Math.pow(2, i) * 1000);
  }
}
```

---

## Changelog

### [0.1.1](https://github.com/joseph0926/firsttx/releases/tag/%40firsttx%2Ftx%400.1.1) - 2025-10-13

**Added**

Transaction timeout mechanism using Promise.race() to prevent indefinite hanging
Proper 'failed' status when compensation fails (previously remained as 'rolled-back')

**Improved**

Comprehensive test coverage for timeout scenarios and status transitions
Accurate reflection of final transaction state

---

## Related Packages

- [`@firsttx/local-first`](https://www.npmjs.com/package/@firsttx/local-first) - IndexedDB models
- [`@firsttx/prepaint`](https://www.npmjs.com/package/@firsttx/prepaint) - Instant restoration

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
