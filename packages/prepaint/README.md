# @firsttx/prepaint

> [Main README](https://github.com/joseph0926/firsttx/blob/main/README.md)

Instant Replay for CSR: prepaint real UI from local snapshots **before** your main bundle arrives. Hydrate if the DOM matches; otherwise replace with a smooth View Transition. No SSR required (optional SSR‑Lite shell for cold starts).

- **Boot script target**: < 2KB gzip
- **Flow**: boot → snapshot → prepaint → handoff (hydrate/replace) → server sync
- **Works with**: React 18+

### Install

```bash
pnpm add @firsttx/prepaint
```

Add the Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import prepaint from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

### Prepaint template

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

### Handoff

```ts
// main.tsx
import { handoff } from '@firsttx/prepaint';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const root = document.getElementById('root')!;
  if (strategy === 'hydrate-match') {
    hydrateRoot(root, <App />);
  } else {
    createRoot(root).render(<App />);
  }
});
```

### Notes

- If the DOM mismatches at hydration time, we automatically fall back to **replace**.
- If the browser supports `document.startViewTransition`, we wrap swaps for a smoother experience.
