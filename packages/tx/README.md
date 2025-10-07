# @firsttx/tx

**Atomic optimistic updates for CSR.** Group UI mutations and server effects into a **single transaction**. On failure, **automatic rollback** restores UI/state (optionally wrapped in a View Transition). Sensible **built‑in retry** for transient network errors.

- **Semantics**: all‑or‑nothing (commit or full rollback)
- **Retry**: default 1 attempt (configurable)
- **ViewTransition**: smooth sync/rollback when supported
- **Journal awareness**: detects in‑flight work at boot (policies extensible)
- **Requirements**: Node 18+, React 18+ (pairs with `@firsttx/local-first`)

---

## Install

```bash
pnpm add @firsttx/tx
```

---

## Quick start

```ts
import { startTransaction } from '@firsttx/tx';
import { CartModel } from '../models/cart';

export async function addToCart(product: { id: string }) {
  const tx = startTransaction({ transition: true });

  // Step 1: optimistic patch
  await tx.run(
    async () => {
      await CartModel.patch((d) => {
        const it = d.items.find((x) => x.id === product.id);
        if (it) it.qty += 1;
        else d.items.push({ ...product, title: '', price: 0, qty: 1 });
        d.updatedAt = Date.now();
      });
    },
    {
      compensate: async () => {
        await CartModel.patch((d) => {
          const it = d.items.find((x) => x.id === product.id);
          if (!it) return;
          it.qty -= 1;
          if (it.qty <= 0) d.items = d.items.filter((x) => x.id !== product.id);
          d.updatedAt = Date.now();
        });
      },
    },
  );

  // Step 2: server confirmation (with retry)
  await tx.run(() => api.post('/cart/add', { id: product.id }), {
    retry: { maxAttempts: 3, delayMs: 200, backoff: 'exponential' },
  });

  await tx.commit();
}
```

On any step failure, Tx performs **automatic rollback** (compensation runs in reverse order). Wraps rollback with ViewTransition when enabled and supported.

---

## API

```ts
// create a transaction
startTransaction(options?: TxOptions): Transaction

// add and run a step
transaction.run(
  fn: () => Promise<void>,
  options?: StepOptions
): Promise<void>

// finalize
transaction.commit(): Promise<void>
```

**Types**

```ts
export type RetryConfig = {
  maxAttempts?: number; // default: 1
  delayMs?: number; // default: 100
  backoff?: 'linear' | 'exponential'; // default: 'exponential'
};

export type StepOptions = {
  compensate?: () => Promise<void>;
  retry?: RetryConfig;
};

export type TxOptions = {
  id?: string;
  transition?: boolean; // wrap rollback (and certain swaps) in ViewTransition
  timeout?: number; // abort if exceeded (ms)
};
```

**Error classes**

```ts
class CompensationFailedError extends Error {
  constructor(
    message: string,
    public failures: Error[],
  ) {
    super(message);
  }
}

class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public lastError: Error,
    public attempts: number,
  ) {
    super(message);
  }
}

class TransactionTimeoutError extends Error {
  constructor(
    message: string,
    public timeoutMs: number,
  ) {
    super(message);
  }
}
```

---

## Behavior & Guarantees

- **Atomicity**: either all steps complete and `commit()` succeeds, or the system rolls back by running `compensate` in reverse order.
- **Automatic rollback**: failures in `run()` trigger rollback without extra user code.
- **Compensation policy**: if any `compensate` throws, Tx aggregates errors and throws `CompensationFailedError` (no infinite retry loops).
- **Retry scope**: intended for transient network failures; tune or disable via `retry` configs.

---

## Tips

- Keep each step idempotent where possible; compensation should deterministically revert that step.
- For UI polish, enable `{ transition: true }` to animate rollbacks on supported browsers.
- Combine with `@firsttx/local-first` for fast optimistic updates and durable local state.

---

## License

MIT
