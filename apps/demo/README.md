# Demo Cart

A demonstration application showcasing the integration of `@firsttx/local-first` and `@firsttx/tx` packages for building optimistic UI with atomic rollback capabilities.

## What This Demonstrates

This app illustrates the core FirstTx patterns:

- **Local-First Data**: Persistent IndexedDB models with React integration via `useModel` hook
- **Atomic Transactions**: Optimistic updates with automatic rollback on failure
- **ViewTransition**: Smooth UI transitions during sync and rollback operations

## Getting Started

```bash
# Install dependencies (from repo root)
pnpm install

# Start development server
cd apps/demo-cart
pnpm dev
```

## Architecture

```
CartModel (Local-First)
    ↓
useModel hook (React integration)
    ↓
Transaction (Tx)
    ↓
Optimistic UI + Atomic Rollback
```

## Key Files

- `src/models/CartModel.ts` - Local-First model definition with Zod schema
- `src/pages/CartPage.tsx` - React component using `useModel` + `startTransaction`
- `src/main.tsx` - App entry point

## Usage Pattern

```typescript
// 1. Define model
const CartModel = defineModel('cart', {
  schema: z.object({ items: z.array(...) }),
  ttl: 5 * 60 * 1000
})

// 2. Use in React
const [cart, patch, history] = useModel(CartModel)

// 3. Atomic operations
const tx = startTransaction({ transition: true })
await tx.run(() => patch(...), { compensate: () => patch(...) })
await tx.run(() => api.post(...), { retry: { maxAttempts: 3 } })
await tx.commit()
```

## What to Test

1. **Optimistic Update**: Click "+1" → UI updates immediately
2. **Server Success**: API succeeds → state persists
3. **Server Failure**: API fails → automatic rollback to previous state
4. **ViewTransition**: Observe smooth animations during state changes
5. **Persistence**: Refresh page → data persists via IndexedDB

## Requirements

- Node.js >= 22.20.0
- Modern browser with IndexedDB support
- ViewTransition API (Chrome 111+) recommended for smooth animations
