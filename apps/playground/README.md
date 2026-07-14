# FirstTx Playground

## Overview

Ever struggled with blank screens on CSR revisits, stale client data, or inconsistent rollback behavior? This interactive playground demonstrates FirstTx behavior and limitations through 9 scenarios.

FirstTx combines three layers—Prepaint (visual snapshot replay), Local-First (persistent client cache), and Tx (optimistic sagas)—for CSR revisit flows. This playground lets you inspect each layer in action.

## What You Can Experience

### Prepaint: Visual Snapshot Replay (2 scenarios)

Reduce blank screen time on revisits by displaying the last captured visual state before the app mounts.

- **Heavy Page**: Measure warm-revisit blank time with 100+ product grids
- **Route Switching**: See how prepaint integrates with React Router 7 across multiple routes

### Sync: Server Synchronization (3 scenarios)

Handle the complexity of keeping local and server data in sync.

- **Server Replacement Merge**: Watch how the configured merge function combines local and incoming server data
- **Timing Attack**: See what happens when server sync arrives during transaction execution
- **Staleness Detection**: Understand TTL expiry and stale data handling strategies

### Tx: Optimistic Sagas (3 scenarios)

Run compensating rollback for completed steps when a later step fails.

- **Concurrent Updates**: Observe the current hook's shared pending/cancel state under overlapping requests
- **Rollback Chain**: Observe multi-step transaction rollback in reverse order
- **Network Chaos**: Test retry logic and error handling under unstable network conditions

## Why This Matters

Traditional CSR apps suffer from:

- **Cold start penalty**: Every visit loads from scratch
- **Fragmented rollback**: Partial failures leave inconsistent state
- **Complex sync logic**: Manual server merge and staleness checks

FirstTx provides:

- **Measured revisit replay**: Prepaint captures and restores visual snapshots before the app mounts
- **Compensating rollback**: Tx runs completed compensations in reverse order, with ViewTransition integration
- **Persistent cache**: Local-First manages TTL, cross-tab invalidation, and server replacement merges

This playground demonstrates these benefits through interactive scenarios that reveal both the strengths and edge cases of each approach.

## Architecture

```
apps/playground/
├── src/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── prepaint/
│   │   │   ├── sync/
│   │   │   └── tx/
│   │   └── components/
│   ├── models/
│   └── lib/
```

Built with:

- **React 19** + **React Router 7**: Modern React patterns
- **Vite**: Fast development experience
- **FirstTx packages**: @firsttx/prepaint, @firsttx/local-first, @firsttx/tx
- **Tailwind CSS 4**: Utility-first styling

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

Navigate to each scenario from the landing page to explore different FirstTx capabilities.

## Performance Targets

The scenarios expose example metrics. Results depend on the browser, device, page size, and network profile:

- **BlankScreenTime (BST)** on warm visits
- **Legacy direct-restore hydration outcome**
- **Tx rollback duration** for multi-step compensation
- **Server replacement merge duration**

## Learn More

- [FirstTx Documentation](../../README.md)
- [Prepaint Package](../../packages/prepaint)
- [Local-First Package](../../packages/local-first)
- [Tx Package](../../packages/tx)

## License

MIT
