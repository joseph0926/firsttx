# @firsttx/prepaint

**Instant Replay for CSR Apps - ~0ms Blank Screen on Revisit**

Prepaint eliminates blank screens on return visits by instantly restoring your app's last visual state before your main JavaScript bundle loads.

---

## What is Prepaint?

Traditional CSR apps show a blank screen on every page load while waiting for

1. HTML parsing
2. JavaScript download & execution
3. React initialization
4. Component rendering & API calls

**Prepaint's solution**

```
Traditional CSR
User visits → Blank screen (2000ms) → Content appears

With Prepaint
User revisits → Last snapshot appears (~0ms) → React hydrates → Fresh data syncs
```

---

## Quick Start

### Installation

```bash
pnpm add @firsttx/prepaint
```

### Setup (2 steps)

#### Step 1: Configure Vite Plugin

```tsx
// vite.config.ts
import { defineConfig } from 'vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx(), // Auto-injects boot script (<2KB)
  ],
});
```

**What it does**

- Bundles a tiny boot script (1.74KB) and injects it into `<head>`
- Runs before your main bundle to restore snapshots instantly
- Zero manual configuration needed

#### Step 2: Update Your React Entry Point

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

// Before
// // createRoot(document.getElementById('root')!).render(<App />);

// After
// createFirstTxRoot(document.getElementById('root')!, <App />);
```

That's it! Prepaint now

- ✅ Captures snapshots automatically on page unload
- ✅ Restores them instantly on revisit
- ✅ Hydrates React smoothly with ViewTransition

---

## How It Works

### Three-Phase Process

```
┌─────────────────────────────────────────┐
│ Phase 1: Capture (beforeunload)        │
│ User leaves → Snapshot saved to IndexedDB │
│ { route, body, styles, timestamp }      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Phase 2: Boot (~0ms)                    │
│ HTML loads → Boot script runs           │
│ Read IndexedDB → Inject DOM instantly   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Phase 3: Handoff (~500ms)               │
│ Main bundle loads → React hydrates      │
│ Reuse DOM (80% success) or patch (20%)  │
└─────────────────────────────────────────┘
```

**Key Implementation Details**

- **Storage**: IndexedDB database `firsttx-prepaint` → store `snapshots`
- **Marker**: Sets `data-prepaint` attribute on `<html>` element
- **TTL**: Snapshots expire after 7 days
- **Route-based**: Each route has its own snapshot

---

## API Reference

### `createFirstTxRoot(container, element, options?)`

Drop-in replacement for `createRoot()` with automatic capture and intelligent hydration.

```tsx
createFirstTxRoot(
  container: HTMLElement,
  element: ReactElement,
  options?: {
    transition?: boolean; // Use ViewTransition? (default: true)
  }
)
```

**Example**

```tsx
createFirstTxRoot(
  document.getElementById('root')!,
  <App />,
  { transition: true }, // Smooth animations during hydration
);
```

**What it does**

1. Checks if snapshot exists (`handoff()`)
2. If exists → `hydrateRoot()` (React reuses DOM)
3. If not → `createRoot()` (normal CSR)
4. Wraps in ViewTransition for smooth updates

---

### Vite Plugin: `firstTx(options?)`

```tsx
import { firstTx } from '@firsttx/prepaint/plugin/vite';

firstTx({
  inline?: boolean;    // Inline script or external file (default: true)
  minify?: boolean;    // Minify boot script (default: true in prod)
  injectTo?: string;   // Injection position (default: 'head-prepend')
})
```

**Example - Custom Configuration**

```tsx
// vite.config.ts
export default defineConfig({
  plugins: [
    firstTx({
      inline: true, // Inline for best performance
      minify: true, // Minify in production
      injectTo: 'head-prepend', // Inject at top of <head>
    }),
  ],
});
```

---

## Best Practices

### 1. Combine with Local-First for Maximum Effect

```tsx
import { defineModel, useModel } from '@firsttx/local-first';

const ProductsModel = defineModel('products', {
  schema: z.object({ items: z.array(...) }),
  ttl: 5 * 60 * 1000
});

function ProductsPage() {
  const [products] = useModel(ProductsModel);

  // ✅ Instant visual (Prepaint) + instant data (Local-First)
  return products ? <ProductList items={products.items} /> : <Skeleton />;
}
```

### 2. Enable ViewTransition for Smooth Updates

```tsx
// ✅ Recommended (default)
createFirstTxRoot(root, <App />, { transition: true });

// Only disable if ViewTransition causes issues
createFirstTxRoot(root, <App />, { transition: false });
```

### 3. Test Both Paths

```tsx
// Clear snapshots to test cold start
indexedDB.deleteDatabase('firsttx-prepaint');
// Reload page → normal CSR experience

// Visit page normally → leave → return
// → instant replay experience
```

---

## Debugging

### Check if Snapshot Exists

```tsx
// Open DevTools console
indexedDB.open('firsttx-prepaint').onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('snapshots', 'readonly');
  const store = tx.objectStore('snapshots');
  store.getAll().onsuccess = (e) => {
    console.log('Snapshots:', e.target.result);
  };
};
```

### Verify Boot Script Injection

Check `<head>` in browser DevTools - you should see

```html
<head>
  <script>
    try{...boot script...}catch(e){console.error('[FirstTx] Boot script failed:',e);}
  </script>
  <!-- rest of head -->
</head>
```

### Check Console Logs (Development Mode)

```
[FirstTx] Running in development mode - boot script will not be minified
[FirstTx] Boot script generated (1.74KB)
[FirstTx] Snapshot restored (age: 5s)  // On revisit
[FirstTx] Prepaint detected (age: 5000ms)  // During handoff
```

---

## Performance

| Metric                | Target    | Actual    |
| --------------------- | --------- | --------- |
| **Boot script size**  | <2KB      | ✅ 1.74KB |
| **Boot time**         | <20ms     | ✅ ~15ms  |
| **Snapshot size**     | ~50-200KB | ~100KB    |
| **Hydration success** | >80%      | ✅ ~82%   |

**Hydration mismatch scenarios** (20%)

- Dynamic timestamps changed
- CSS-in-JS with random class names
- Conditional rendering based on client-only state

**Solution** React handles mismatches automatically—no action needed.

---

## Current Limitations

| Limitation                | Workaround                                            |
| ------------------------- | ----------------------------------------------------- |
| Vite-only plugin          | Use manual `<script>` for other bundlers              |
| beforeunload-only capture | Covers 90%+ cases; browser crash loses snapshot       |
| Full-page capture only    | Works for most SPA use cases                          |
| 7-day fixed TTL           | Source modification required (v0.2.0 will add config) |

---

## Comparison with Alternatives

| Feature          | Prepaint      | SSR         | Service Worker Cache     |
| ---------------- | ------------- | ----------- | ------------------------ |
| First visit      | Normal CSR    | ⚡ Fast     | Normal CSR               |
| Revisit          | ⚡ Instant    | ⚡ Fast     | Fast (network dependent) |
| SEO              | ❌            | ✅          | ❌                       |
| Server needed    | ❌            | ✅ Required | ❌                       |
| Offline support  | ✅ Last state | ❌          | ✅ Cached resources      |
| Setup complexity | Low           | High        | Medium                   |

---

## Browser Support

- **Chrome/Edge 111+**: Full support (ViewTransition)
- **Firefox/Safari**: Core features work (graceful degradation without ViewTransition)
- **Mobile**: iOS Safari 16+, Chrome Android 111+

---

## FAQ

**Q: Does this work with SSR/Next.js?**  
A: No. Prepaint is designed for pure CSR apps. Use Next.js's built-in SSR for SSR apps.

**Q: What if React hydration fails?**  
A: React patches the DOM automatically. ViewTransition makes it smooth.

**Q: Does this increase memory usage?**  
A: Minimally. Snapshots live in IndexedDB (disk). Memory impact ~100KB during boot.

**Q: Can I capture specific routes only?**  
A: Not in v0.1.0. All routes are captured. Route filtering coming in v0.2.0.

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Links

- [Main Repository](https://github.com/joseph0926/firsttx)
- [@firsttx/local-first](../local-first) - Data persistence layer
- [@firsttx/tx](../tx) - Transaction layer
