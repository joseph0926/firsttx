# Getting Started

## What is FirstTx?

FirstTx is an optimization toolkit for CSR (Client-Side Rendering) React applications.

It removes blank screens on revisit, provides offline data durability, and offers optimistic UI transactions.

FirstTx is composed of three packages:

- Prepaint: Stores the last screen as a DOM snapshot and restores it instantly.
- Local-First: Maintains state offline with an IndexedDB-based data layer.
- Tx: Groups optimistic updates into a transaction and automatically rolls them back on failure.

## Installation

### Full installation (recommended)

Use this when you want to use all three packages.

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx zod
```

`zod` is used in Local-First to validate the type and integrity of model data. If data stored in IndexedDB does not match the schema, it is automatically cleaned up.

### Partial installation

You can selectively install only the features you need.

If you only need revisit optimization:

```bash
pnpm add @firsttx/prepaint
```

If you need revisit optimization + data synchronization:

```bash
pnpm add @firsttx/prepaint @firsttx/local-first zod
```

If you need data synchronization + optimistic updates:

```bash
pnpm add @firsttx/local-first @firsttx/tx zod
```

### Requirements

- React 18.2.0 or higher: uses the `createRoot` and `hydrateRoot` APIs
- Vite 5 or higher: required when using the Prepaint plugin
- Node.js 22 or higher

## Basic setup

This section describes the required setup for each package.

### Prepaint setup (when using revisit optimization)

#### 1. Vite plugin configuration

Prepaint injects a boot script into HTML as a Vite plugin. This script runs before React and restores the last screen from IndexedDB.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { firstTx } from "@firsttx/prepaint/plugin/vite";

export default defineConfig({
  plugins: [
    react(),
    firstTx(),
  ],
});
```

#### 2. Entry point configuration

Use `createFirstTxRoot` instead of the existing `ReactDOM.createRoot`.

```tsx
// main.tsx
import { createFirstTxRoot } from "@firsttx/prepaint";
import { App } from "./App";

createFirstTxRoot(
  document.getElementById("root")!,
  <App />
);
```

`createFirstTxRoot` handles the following:

- Saves the current screen to IndexedDB when the page is left
- Restores the stored screen immediately on revisit before React is loaded
- Applies smooth transition effects in browsers that support the ViewTransition API
- Mounts the React app via hydration or client rendering

### Using only Local-First / Tx

If you use Local-First and Tx without Prepaint, no special initial setup is required. You can directly import hooks and functions into your existing React app and start using them.

## First example

### Model definition (Local-First)

Define a model to be stored in IndexedDB using `defineModel`.

```ts
// models/cart.ts
import { defineModel } from "@firsttx/local-first";
import { z } from "zod";

export const CartModel = defineModel("cart", {
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        qty: z.number(),
      }),
    ),
  }),
  ttl: 5 * 60 * 1000, // 5 minutes (default)
  initialData: {
    items: [],
  },
});
```

### Using the model in a component

Use the `useSyncedModel` hook to synchronize the model with the server.

```tsx
// CartPage.tsx
import { useSyncedModel } from "@firsttx/local-first";
import { CartModel } from "./models/cart";

async function fetchCart() {
  const res = await fetch("/api/cart");
  if (!res.ok) throw new Error("Failed to fetch cart");
  return res.json();
}

export function CartPage() {
  const { data: cart, isSyncing, patch } = useSyncedModel(CartModel, fetchCart, {
    syncOnMount: "stale", // Sync with the server only when TTL has expired
  });

  if (!cart) return <div>Loading...</div>;

  return (
    <ul>
      {cart.items.map((item) => (
        <li key={item.id}>{item.name} x {item.qty}</li>
      ))}
    </ul>
  );
}
```

### Optimistic updates (Tx)

Use `startTransaction` to group optimistic updates and server requests into a single transaction. If the server request fails, the changes are rolled back automatically.

```ts
// cart-actions.ts
import { startTransaction } from "@firsttx/tx";
import { CartModel } from "./models/cart";

export async function addToCart(item: { id: string; name: string; qty: number }) {
  const tx = startTransaction();

  // Step 1: Update the local model (immediately reflected in the UI)
  await tx.run(
    () => CartModel.patch((draft) => {
      draft.items.push(item);
    }),
    {
      // Roll back on failure
      compensate: () => CartModel.patch((draft) => {
        draft.items.pop();
      }),
    }
  );

  // Step 2: Persist to the server
  await tx.run(() =>
    fetch("/api/cart", {
      method: "POST",
      body: JSON.stringify(item),
    })
  );

  await tx.commit();
}
```
