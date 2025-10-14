# @firsttx/prepaint

**Instant replay for CSR apps — ~0ms blank screen on revisit**

Restores your app's last visual state from IndexedDB before JavaScript loads. No blank screens. Automatic React hydration with graceful fallback.

<table>
<tr>
<td align="center">❌ Before prepaint</td>
<td align="center">✅ After prepaint</td>
</tr>
<tr>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-01_vi2svy.gif" /></td>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-02_tfmsy7.gif" /></td>
</tr>
<tr>
<td align="center"><sub>Slow 4G: Blank screen exposed</sub></td>
<td align="center"><sub>Slow 4G: Instant restore</sub></td>
</tr>
</table>

```bash
npm install @firsttx/prepaint
```

[![npm version](https://img.shields.io/npm/v/@firsttx/prepaint.svg)](https://www.npmjs.com/package/@firsttx/prepaint)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## The Problem

```
Traditional CSR on revisit:
User clicks → Blank screen (2000ms) → Content appears

With Prepaint:
User clicks → Last snapshot (~0ms) → React hydrates → Fresh data
```

Prepaint captures DOM snapshots per route and replays them instantly on the next visit.

---

## Quick Start

### 1. Vite Plugin

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx()],
});
```

### 2. React Entry

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

**Done.** Prepaint now:

- Captures snapshots on page hide/unload
- Restores them in ~0ms on revisit
- Hydrates with React (or falls back gracefully)

---

## How It Works

### Three Phases

```
┌─────────────────────────────────┐
│ 1) Capture (on page leave)     │
│  - beforeunload/pagehide/       │
│    visibilitychange             │
│  - Saves DOM + styles to        │
│    IndexedDB                    │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ 2) Boot (~0ms on revisit)       │
│  - Inline script runs           │
│  - Reads snapshot from IndexedDB│
│  - Injects into #root           │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ 3) Handoff (~500ms)             │
│  - Main bundle loads            │
│  - Hydrates or client-renders   │
│  - Cleans up prepaint artifacts │
└─────────────────────────────────┘
```

**Storage**

- DB: `firsttx-prepaint`
- Store: `snapshots`
- Key: route pathname
- TTL: 7 days

---

## API

### `createFirstTxRoot(container, element, options?)`

```typescript
createFirstTxRoot(
  container: HTMLElement,
  element: ReactElement,
  options?: {
    transition?: boolean;  // ViewTransition (default: true)
    onCapture?: (snapshot: Snapshot) => void;
    onHandoff?: (strategy: 'has-prepaint' | 'cold-start') => void;
    onHydrationError?: (error: Error) => void;
  }
);
```

**Behavior**

- If snapshot exists + `#root` has 1 child → `hydrateRoot()`
- Otherwise → `createRoot()` fresh render
- On hydration error → fallback to clean render (with ViewTransition)

### `firstTx(options?)` (Vite Plugin)

```typescript
firstTx({
  inline?: boolean,              // Inline boot script (default: true)
  minify?: boolean,              // Minify boot script (default: !isDev)
  injectTo?: 'head-prepend' | 'head' | 'body-prepend' | 'body',
  nonce?: string | (() => string),
  overlay?: boolean,             // Enable overlay mode globally
  overlayRoutes?: string[],      // Overlay for specific routes
})
```

---

## Overlay Mode

**Problem** Direct injection into `#root` can race with routers, causing duplicate DOM.

**Solution** Overlay mode paints the snapshot **above** your app in Shadow DOM, then fades out after hydration.

### Enable Overlay

```js
// Option 1: Global flag
window.__FIRSTTX_OVERLAY__ = true;

// Option 2: localStorage (persists)
localStorage.setItem('firsttx:overlay', '1');

// Option 3: Specific routes
localStorage.setItem('firsttx:overlayRoutes', '/prepaint,/dashboard');

// Option 4: Vite plugin
firstTx({ overlay: true });
```

### Disable

```js
delete window.__FIRSTTX_OVERLAY__;
localStorage.removeItem('firsttx:overlay');
localStorage.removeItem('firsttx:overlayRoutes');
```

---

## Real-World Patterns

### With Local-First

```tsx
import { useModel } from '@firsttx/local-first';

function ProductsPage() {
  const [products] = useModel(ProductsModel);

  // Prepaint shows last snapshot
  // useModel provides instant data from IndexedDB
  if (!products) return <Skeleton />;

  return <ProductList products={products} />;
}
```

### Mark Volatile Content

```tsx
// These change on every render → exclude from snapshot
<span data-firsttx-volatile>{Date.now()}</span>
<div data-firsttx-volatile>{Math.random()}</div>
<Timer data-firsttx-volatile />
```

### Debug Lifecycle

```tsx
createFirstTxRoot(root, <App />, {
  onCapture: (snapshot) => console.log('Captured:', snapshot.route),
  onHandoff: (strategy) => console.log('Strategy:', strategy),
  onHydrationError: (err) => console.error('Hydration failed:', err),
});
```

---

## Hydration & Fallback

### Single-Child Rule

Prepaint only attempts hydration if `#root` has **exactly 1 child**. Otherwise → fresh render.

### Root Guard

After mount, a MutationObserver watches `#root`:

- Detects extra children (e.g., router appending siblings)
- Unmounts → clears → re-renders cleanly
- Prevents "double UI" issues

### Cleanup

Post-mount:

- Removes `<html data-prepaint="true">`
- Removes `style[data-firsttx-prepaint]`
- Removes overlay host `#__firsttx_prepaint__`

---

## Best Practices

### DO

✅ **Use ViewTransition (default)**

```tsx
createFirstTxRoot(root, <App />, { transition: true });
```

✅ **Mark volatile content**

```html
<span data-firsttx-volatile>{timestamp}</span>
```

✅ **Combine with Local-First**

```tsx
const [data] = useModel(Model);
// Instant data from IndexedDB while network refreshes
```

### DON'T

❌ **Don't expect instant availability on first visit**

```tsx
// First visit: snapshot doesn't exist yet
// Only kicks in on second+ visits
```

❌ **Don't capture sensitive data**

```tsx
// Snapshots are plain HTML in IndexedDB
// Avoid capturing auth tokens, PII, etc.
```

---

## Debugging

### Development Logs

```
[FirstTx] Snapshot restored (age: 63ms)
[FirstTx] Prepaint detected (age: 63ms)
[FirstTx] Snapshot captured for /products
```

### Inspect IndexedDB

```js
indexedDB.open('firsttx-prepaint').onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('snapshots', 'readonly');
  tx.objectStore('snapshots').getAll().onsuccess = (e2) => {
    console.log(e2.target.result);
  };
};
```

### Check Injection

On revisit, look for:

- `<html data-prepaint="true" data-prepaint-timestamp="...">`
- Boot script near `<head>` top
- Temporary `style[data-firsttx-prepaint]`

---

## Performance

| Metric            | Target | Actual  |
| ----------------- | ------ | ------- |
| Boot script size  | <2KB   | ~1.7KB  |
| Boot execution    | <20ms  | ~15ms   |
| Hydration success | >80%   | ~80-85% |

**Hydration mismatches** (timestamps, random IDs, client-only branches) automatically fallback to clean render with ViewTransition.

---

## Browser Support

| Browser     | Min Version                  | ViewTransition | Status        |
| ----------- | ---------------------------- | -------------- | ------------- |
| Chrome/Edge | 111+                         | ✅ Full        | ✅ Tested     |
| Firefox     | Latest                       | ❌ No          | ✅ Fallback   |
| Safari      | 16+                          | ❌ No          | ✅ Fallback   |
| Mobile      | iOS 16+, Android Chrome 111+ | Varies         | ✅ Core works |

---

## Limitations

| Issue                  | Workaround                           |
| ---------------------- | ------------------------------------ |
| Vite-only plugin       | Manual `<script>` for other bundlers |
| Fixed 7-day TTL        | Override in source (config planned)  |
| Full-page capture only | Sub-tree snapshots not supported yet |

---

## FAQ

**Q: Does this work with SSR/Next.js?**

A: No. Prepaint targets pure CSR apps. For SSR, use framework's native features.

---

**Q: Will this increase memory usage?**

A: Snapshots live in IndexedDB (disk). Memory overhead is minimal during boot.

---

**Q: How do I prevent duplicate UI?**

A: Use overlay mode or rely on the root guard:

```tsx
firstTx({ overlay: true });
```

---

**Q: Can I restrict capture to certain routes?**

A: Use `setupCapture()` manually or filter at app layer. Default captures all routes.

---

**Q: What if hydration fails?**

A: Automatic fallback to clean client render (with ViewTransition if enabled). No manual intervention needed.

---

## Changelog

### [0.3.0](https://github.com/joseph0926/firsttx/releases/tag/%40firsttx%2Fprepaint%400.3.0) - 2025.10.12

**Add overlay mode and hard hydration bailout to prepaint**

This release introduces significant improvements to snapshot capture and hydration reliability:

**Breaking Changes**

- `captureSnapshot()` now uses root element serialization instead of `body.innerHTML`
- Requires `#root` element to be present for capture to work

**New Features**

- **Overlay mode support** Adds global `__FIRSTTX_DEV__` flag for development logging
- **Volatile data handling** Elements with `data-firsttx-volatile` attribute are automatically cleared during capture (useful for timestamps, random values)
- **Style filtering** Prepaint-injected styles are now excluded from capture via `data-firsttx-prepaint` attribute
- **Enhanced capture timing**
  - Captures on `visibilitychange` (when page becomes hidden)
  - Captures on `pagehide` (mobile-friendly)
  - Maintains `beforeunload` capture
  - Debounced with microtask queue to prevent duplicate saves

**Improvements**

- Cleaner serialization: Only captures first child of root element
- More reliable hydration: Filters out dynamic content that causes mismatches
- Better mobile support: `pagehide` event works more reliably on iOS/Android
- Development experience: `__FIRSTTX_DEV__` replaces `process.env.NODE_ENV` checks

**Migration Guide**

```tsx
// If you have dynamic content that changes on every render:
<span data-firsttx-volatile>{Date.now()}</span>
<div data-firsttx-volatile>{Math.random()}</div>

// Vite plugin automatically injects __FIRSTTX_DEV__ flag
// No changes needed to your vite.config.ts
```

---

## Related Packages

- [`@firsttx/local-first`](https://www.npmjs.com/package/@firsttx/local-first) - IndexedDB + React integration
- [`@firsttx/tx`](https://www.npmjs.com/package/@firsttx/tx) - Atomic transactions with rollback

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
