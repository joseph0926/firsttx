# @firsttx/prepaint

**Instant Replay for CSR.** Prepaint real UI from local snapshots **before** your main bundle arrives. Hydrate if the DOM matches; otherwise, replace with a smooth View Transition. No SSR required (optional SSR‑Lite shell for cold starts).

- **Boot script target**: < 2KB gzip
- **Flow**: boot → snapshot → prepaint → handoff (hydrate/replace) → server sync
- **Pairs with**: `@firsttx/local-first` (snapshot‑aware data) and `@firsttx/tx` (smooth rollback)
- **Requirements**: React 18+, Node 18+, View Transitions (Chrome 111+) for best results

---

## Install

```bash
pnpm add @firsttx/prepaint
```

Enable the Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import prepaint from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

---

## Prepaint template

Use the `"use prepaint"` directive and access snapshot context:

```tsx
// routes/cart.prepaint.tsx
'use prepaint';
import { prepaint } from '@firsttx/prepaint';

export default prepaint((ctx) => {
  const items = ctx.snap?.cart?.items ?? [];
  const ageHours = Math.floor((ctx.snapAge ?? 0) / 3600000);

  if (items.length === 0) return <CartSkeleton />;

  return (
    <div className="cart">
      {ageHours > 0 && <span className="muted">{ageHours}h old data</span>}
      {items.map((it) => (
        <CartItem key={it.id} {...it} />
      ))}
    </div>
  );
});
```

---

## Handoff

Automatically attempts hydration; falls back to replace, optionally wrapped in a View Transition:

```ts
// main.tsx
import { handoff } from '@firsttx/prepaint';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const container = document.getElementById('root')!;
  if (strategy === 'hydrate-match') {
    hydrateRoot(container, <App />);
  } else {
    createRoot(container).render(<App />);
  }
});
```

---

## Notes & Limits

- **Snapshots**: DOM + essential styles. Data freshness is clarified via badges in your UI until server sync.
- **Hydration mismatch**: We fall back to replace; when available, swaps are wrapped with `document.startViewTransition`.
- **CSS‑in‑JS**: Static styles are captured; dynamic prop styles finalize post‑hydration (minimize flicker with transitions).
- **Security**: Do not store highly sensitive data in snapshots; keep PII in memory or encrypt at rest if needed.

---

## License

MIT
