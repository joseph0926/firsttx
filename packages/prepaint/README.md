# @firsttx/prepaint

**Boot-time visual snapshot replay for CSR apps**

Replays your app's last visual state from IndexedDB before the main app bundle starts, reducing the blank interval while React mounts. The snapshot is a temporary, non-interactive visual cache.

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
<td align="center"><sub>Slow 4G: Snapshot replay</sub></td>
</tr>
</table>

```bash
npm install @firsttx/prepaint
```

[![npm version](https://img.shields.io/npm/v/@firsttx/prepaint.svg)](https://www.npmjs.com/package/@firsttx/prepaint)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Module format: ESM-only. CommonJS users should use `import()` (dynamic import).

---

## Why Prepaint?

**Replay the last visual state without adding an SSR runtime.**

- No SSR/SSG infrastructure needed
- Designed for Vite-based CSR React apps
- Shadow DOM overlay keeps cached DOM separate from the React root
- Native ViewTransition support

### The Problem

```
Traditional CSR on revisit:
User clicks → Blank screen (2000ms) → Content appears

With Prepaint:
User clicks → Last visual snapshot → React app mounts → Fresh data
```

Prepaint captures DOM snapshots per route and replays them during boot on the next visit. Replay time depends on the device, snapshot size, and storage state.

---

## Quick Start

### 1. Vite Plugin

Prepaint currently provides a Vite plugin only.

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx({ policy: { routes: ['/dashboard', '/cart'] } })],
});
```

Prepaint is disabled until `policy.routes` explicitly opts pathnames in. Matching is exact, and the same policy governs capture, restore, and stored-record pruning. Snapshot restore always uses a non-interactive overlay outside the React root.

### 2. React Entry

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

**Done.** Prepaint now:

- Prepares snapshots during idle time and saves a final state on hidden/pagehide
- Replays a visual snapshot during boot on revisit
- Hands control to the React app when the main bundle runs

---

## How It Works

### Three Phases

```
┌─────────────────────────────────┐
│ 1) Capture                     │
│  - idle preparation             │
│  - pagehide/visibilitychange    │
│  - Saves DOM + styles to        │
│    IndexedDB                    │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ 2) Boot (measured on revisit)   │
│  - External script runs         │
│  - Reads snapshot from IndexedDB│
│  - Paints cached visual DOM     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ 3) Handoff                      │
│  - Main bundle loads            │
│  - Mounts the React app         │
│  - Cleans up prepaint artifacts │
└─────────────────────────────────┘
```

**Storage**

- DB: `firsttx-prepaint`
- Store: `snapshots`
- Key: route pathname
- Default TTL: 7 days
- Default maximum payload: 1 MiB
- Schema v2 clears v1 records once, then every boot prunes records outside the current policy

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
  }
);
```

**Behavior**

- The cached DOM always stays in a non-interactive overlay outside `#root`
- React always mounts with `createRoot()` into an empty container
- The overlay is removed only after React's first commit
- `onHydrationError` remains as a deprecated no-op for one release

### `firstTx(options?)` (Vite Plugin)

```typescript
firstTx({
  inline?: boolean,              // Inline boot script (default: false)
  minify?: boolean,              // Minify boot script (default: !isDev)
  injectTo?: 'head-prepend' | 'head' | 'body-prepend' | 'body',
  nonce?: string | (() => string),
  policy: {
    routes: string[],            // Exact pathnames; empty or omitted disables Prepaint
    ttlMs?: number,              // Default: 7 days
    maxSnapshotBytes?: number,   // Default: 1 MiB, UTF-8 JSON payload
    includeStyles?: boolean,     // Default: true
  },
})
```

Static Vite output uses the self-starting `/firsttx-boot.js` asset by default. Set `inline: true` only when you intentionally manage a CSP hash for the generated inline script. A `nonce` is embedded at build time even when supplied as a function; static output cannot create a per-response nonce.

The previous `overlay` and `overlayRoutes` options remain accepted as deprecated no-ops for one release. The Vite policy is serialized into the boot asset and reused by `setupCapture()`.

Stored HTML is sanitized before overlay insertion. Passwords, marked sensitive fields, dangerous elements, event handlers, and executable URL schemes are removed. CSS is a visual cache, not sanitized application data: use `includeStyles: false` when routes can contain user-controlled or sensitive CSS, and only opt non-sensitive routes in.

---

## Visual Overlay

Prepaint paints the cached snapshot **above** your app in Shadow DOM. The overlay is non-interactive and does not modify the React container.

During handoff, React mounts with `createRoot()` into an empty container. Prepaint removes the overlay only after the first React commit, optionally using ViewTransition.

The following legacy configuration is no longer required:

```js
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
});
```

---

## Visual Handoff Behavior

The restored snapshot is visual cache only. Prepaint never hydrates cached client DOM and does not enforce a single-child React root. Fragments and multiple top-level React nodes are valid.

### Cleanup

Post-mount:

- Removes `<html data-prepaint="true">`
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

## Security

### HTML Sanitization

Prepaint sanitizes all restored HTML to prevent XSS attacks:

- Removes dangerous tags: `<script>`, `<iframe>`, `<form>`, `<object>`, etc.
- Removes event handlers: `onclick`, `onerror`, `onload`, etc.
- Blocks `javascript:` and `data:text/html` URLs

**Note on DOMPurify**

The boot-time restore path uses a synchronous built-in sanitizer for speed. For async helpers (`safeSetInnerHTML`), [DOMPurify](https://github.com/cure53/DOMPurify) is used if available:

```bash
npm install dompurify
```

The built-in fallback covers common attack vectors but may not catch all edge cases. For maximum security in custom restore flows, use `safeSetInnerHTML` with DOMPurify installed.

### Sensitive Data

Prepaint automatically protects sensitive fields:

```tsx
// Password inputs are automatically cleared
<input type="password" />

// Mark custom sensitive fields
<input data-firsttx-sensitive name="ssn" />
<div data-firsttx-sensitive>{authToken}</div>
```

**Best Practices:**

✅ Mark auth tokens and PII with `data-firsttx-sensitive`
✅ Keep session data in memory (not DOM)
❌ Don't store encryption keys in visible elements

### Storage Security

- Snapshots are stored in IndexedDB (browser's same-origin policy applies)
- Data is **not encrypted** — treat IndexedDB like localStorage
- TTL: 7 days (auto-expires)

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
- Temporary overlay host `#__firsttx_prepaint__`

---

## Performance

Measure boot execution, visual replay duration, snapshot size, and handoff timing in your target browser and device profile. Prepaint does not guarantee a universal blank-screen duration.

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

A: Snapshot restore always uses an overlay outside the React root. No additional option is required.

---

**Q: Can I restrict capture to certain routes?**

A: Yes. Configure exact pathnames with `firstTx({ policy: { routes: [...] } })`. Missing or empty routes disable both capture and restore, and stale records are pruned.

---

**Q: Does Prepaint hydrate the saved DOM?**

A: No. Saved DOM is visual cache only. React always mounts into an empty root with `createRoot()`.

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
- [`@firsttx/tx`](https://www.npmjs.com/package/@firsttx/tx) - Optimistic sagas with compensating rollback

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
