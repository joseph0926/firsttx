# FirstTx Playground

## Overview

Ever struggled with blank screens on CSR revisits? Data conflicts during sync? Inconsistent rollback behavior? This interactive playground demonstrates how FirstTx addresses these challenges through 9 real-world scenarios.

FirstTx combines three layers—Prepaint (instant replay), Local-First (client-side state), and Tx (atomic transactions)—to deliver SSR-like revisit experiences without server complexity. This playground lets you experience each layer in action.

## What You Can Experience

### Prepaint: Instant Replay (2 scenarios)

Eliminate blank screen time on revisits by restoring the last captured state instantly.

- **Heavy Page**: Experience 0ms blank screen time with 100+ product grids
- **Route Switching**: See how prepaint integrates with React Router 7 across multiple routes

### Sync: Server Synchronization (3 scenarios)

Handle the complexity of keeping local and server data in sync.

- **Conflict Resolution**: Watch how local modifications resolve against incoming server data
- **Timing Attack**: See what happens when server sync arrives during transaction execution
- **Staleness Detection**: Understand TTL expiry and stale data handling strategies

### Tx: Atomic Transactions (3 scenarios)

Guarantee all-or-nothing updates with automatic rollback on failure.

- **Concurrent Updates**: Execute multiple transactions simultaneously and verify data consistency
- **Rollback Chain**: Observe multi-step transaction rollback in reverse order
- **Network Chaos**: Test retry logic and error handling under unstable network conditions

## Why This Matters

Traditional CSR apps suffer from:

- **Cold start penalty**: Every visit loads from scratch
- **Fragmented rollback**: Partial failures leave inconsistent state
- **Complex sync logic**: Manual conflict resolution and staleness checks

FirstTx provides:

- **Instant revisit**: Prepaint captures and restores UI snapshots (0ms blank screen)
- **Atomic rollback**: Tx ensures all-or-nothing updates with ViewTransition integration
- **Predictable sync**: Local-First manages TTL, conflicts, and server reconciliation

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

Each scenario measures specific metrics:

- **BlankScreenTime (BST)**: < 20ms on warm visits
- **Hydration Success**: > 80% DOM reuse rate
- **Tx Rollback Time**: < 100ms for multi-step rollback
- **Sync Conflict Resolution**: < 100ms for data reconciliation

## Learn More

- [FirstTx Documentation](../../README.md)
- [Prepaint Package](../../packages/prepaint)
- [Local-First Package](../../packages/local-first)
- [Tx Package](../../packages/tx)

## License

MIT
