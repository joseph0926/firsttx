# `@firsttx/prepaint`

**Instant Replay for CSR Apps — ~0ms blank screen on revisit**

Prepaint removes the blank screen on return visits by restoring your app’s last visual state **before** your main JavaScript loads. It reads a snapshot from IndexedDB and paints immediately, then hands off to React for hydration or fresh rendering.

---

## Contents

- [What is Prepaint?](#what-is-prepaint)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Overlay Mode](#overlay-mode)
- [Hydration & Root Guards](#hydration--root-guards)
- [Best Practices](#best-practices)
- [Debugging](#debugging)
- [Performance](#performance)
- [Current Limitations](#current-limitations)
- [Browser Support](#browser-support)
- [FAQ](#faq)
- [License](#license)
- [Links](#links)

---

## What is Prepaint?

Traditional CSR apps show a blank screen on each page load while waiting for:

1. HTML parsing
2. JS download & execution
3. React initialization
4. Component render & API resolution

**Prepaint’s idea**

```
Traditional CSR
User visits  → Blank screen (2000ms) → Content appears

With Prepaint
User revisits → Last snapshot (~0ms) → React hydrates → Fresh data syncs
```

Prepaint persists a DOM snapshot per route, and replays it on the next visit. Hydration then reuses that DOM, or cleanly switches to a fresh render when mismatches happen.

---

## Quick Start

### Install

```bash
pnpm add @firsttx/prepaint
```

### Setup (2 steps)

#### 1) Add the Vite plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx(), // auto-injects a tiny boot script (<2KB)
  ],
});
```

What it does:

- Bundles a tiny IIFE boot script and injects it into the HTML (default: `<head>` prepend).
- Defines `__FIRSTTX_DEV__` at build-time for development logs.
- Runs **before** your main bundle, restoring the last snapshot instantly.

#### 2) Wrap your React entry

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

// Instead of:
// createRoot(document.getElementById('root')!).render(<App />);

// Use:
createFirstTxRoot(document.getElementById('root')!, <App />);
```

That’s it. Prepaint will now:

- Capture snapshots automatically on page hide/unload
- Restore them on revisit in ~0ms
- Hydrate with React and optionally use ViewTransition for smoothness

---

## How It Works

### Three phases

```
┌────────────────────────────────────────┐
│ 1) Capture                             │
│  - Runs on visibilitychange/pagehide/  │
│    beforeunload                        │
│  - Saves { route, body, styles, ts }   │
│    to IndexedDB                        │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│ 2) Boot (~0ms)                         │
│  - HTML loads → boot script runs       │
│  - Reads snapshot from IndexedDB       │
│  - Restores into #root (or overlay)    │
│  - Marks <html data-prepaint="true">   │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│ 3) Handoff (~500ms)                    │
│  - Main bundle loads                   │
│  - createFirstTxRoot() chooses         │
│    hydrateRoot() or createRoot()       │
│  - Cleans up injected styles/overlay   │
│  - Guards ensure single-child #root    │
└────────────────────────────────────────┘
```

**Storage**

- DB: `firsttx-prepaint`
- Object store: `snapshots`
- Key: `route`
- Expiry: 7 days (discarded on boot if stale)

**Markers**

- `<html data-prepaint="true" data-prepaint-timestamp="...">`
- When using overlay: `data-prepaint-overlay="true"`
- Prepaint-injected style tags include `data-firsttx-prepaint`

---

## API Reference

### `createFirstTxRoot(container, element, options?)`

Drop-in replacement for `createRoot()` that performs handoff:

```ts
createFirstTxRoot(
  container: HTMLElement,
  element: React.ReactElement,
  options?: {
    transition?: boolean;           // Use ViewTransition API if available (default: true)
    onCapture?: (s: Snapshot) => void;
    onHandoff?: (strategy: 'has-prepaint' | 'cold-start') => void;
    onHydrationError?: (err: Error) => void;
  }
);
```

Behavior:

- If a snapshot was injected and `#root` has exactly one child → `hydrateRoot()`.
- Otherwise → `createRoot()` fresh render.
- On recoverable hydration error, falls back to a clean client render (optionally inside a ViewTransition).
- After mount, removes prepaint styles/overlay and installs a **root guard** (see below).

### `setupCapture(options?)`

Installed automatically by `createFirstTxRoot()`. You don’t need to call it yourself, but it’s exported if you want manual control.

```ts
setupCapture({
  routes?: string[];           // capture allow-list
  onCapture?: (s: Snapshot) => void;
});
```

Capture triggers are coalesced via `queueMicrotask` behind these events:

- `visibilitychange` (when hidden)
- `pagehide`
- `beforeunload`

### `handoff()`

Internal strategy probe:

```ts
type HandoffStrategy = 'has-prepaint' | 'cold-start';
function handoff(): HandoffStrategy;
```

---

## Overlay Mode

In some apps, injecting HTML directly into `#root` can race with router or meta frameworks and cause duplicate DOM. **Overlay mode** avoids that by painting the snapshot **above** the app in a Shadow DOM, then fading out on hydration.

How it works:

- The boot script mounts a fixed overlay host with id `__firsttx_prepaint__`.
- Snapshot HTML + styles are rendered in the overlay’s shadow root.
- React hydrates underneath; once ready, the overlay is removed.

Enable overlay (pick any):

```js
// 1) Global switch (for all routes in current page)
window.__FIRSTTX_OVERLAY__ = true;

// 2) LocalStorage flag (persists across reloads)
localStorage.setItem('firsttx:overlay', '1'); // or 'true'

// 3) Route prefix list (comma-separated)
localStorage.setItem('firsttx:overlayRoutes', '/prepaint,/dashboard');
```

TypeScript hint (optional):

```ts
// src/global.d.ts
declare global {
  interface Window {
    __FIRSTTX_OVERLAY__?: boolean;
  }
}
export {};
```

Disable:

```js
delete window.__FIRSTTX_OVERLAY__;
localStorage.removeItem('firsttx:overlay');
localStorage.removeItem('firsttx:overlayRoutes');
```

---

## Hydration & Root Guards

### Single‑child rule

Prepaint will only attempt hydration if `#root` has **exactly one** child (the restored snapshot). If not, it falls back to a clean `createRoot()` render.

### Root guard

After mount, a guard watches `#root`:

- If it detects `#root` gaining extra children (e.g., a router or script appending siblings), it **unmounts**, clears `#root`, and re‑renders cleanly.
- This prevents “double UI” issues when frameworks/routing layers also write into `#root`.

### Cleanup

- All prepaint‑injected styles (`style[data-firsttx-prepaint]`) are removed post-mount.
- If overlay mode was used, the overlay host `#__firsttx_prepaint__` is removed post-mount.

---

## Best Practices

### Combine with Local‑First

Use `@firsttx/local-first` to render data instantly from memory/IndexedDB while the network refreshes in the background.

```tsx
const [data] = useModel(ProductsModel);
return data ? <List items={data.items} /> : <Skeleton />;
```

### Use ViewTransition (default)

`createFirstTxRoot(..., { transition: true })` will wrap hydration/fallback in a ViewTransition when supported, smoothing visual differences.

### Mark volatile text

If certain subtrees contain volatile content (e.g., timers, counters), mark them to be cleared during capture:

```html
<span data-firsttx-volatile>00:00</span>
```

---

## Debugging

### Development logs

The plugin injects a build‑time define `__FIRSTTX_DEV__` used by the library for DEV‑only logs.

Typical console output:

```
[FirstTx] Snapshot restored (age: 63ms)
[FirstTx] Prepaint detected (age: 63ms)
[FirstTx] Snapshot captured for /prepaint/route-switching
```

### Inspect snapshots

```js
indexedDB.open('firsttx-prepaint').onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('snapshots', 'readonly');
  const store = tx.objectStore('snapshots');
  store.getAll().onsuccess = (e2) => console.log(e2.target.result);
};
```

### Verify injection

Look for a script injected near the top of `<head>` that calls the boot function. On revisit, you should also see:

- `<html data-prepaint="true" ...>`
- If overlay: `<html data-prepaint-overlay="true" ...>`
- Temporary `style[data-firsttx-prepaint]` tags

---

## Performance

| Metric                 | Target | Typical |
| ---------------------- | ------ | ------- |
| Boot script size       | <2KB   | ~1.7KB  |
| Boot time              | <20ms  | ~15ms   |
| Hydration success rate | >80%   | ~80–85% |

When hydration mismatches occur (dynamic timestamps, randomized CSS class names, client‑only branches), Prepaint automatically falls back to a clean client render. With ViewTransition, the change remains smooth.

---

## Current Limitations

| Limitation         | Workaround                                     |
| ------------------ | ---------------------------------------------- |
| Vite‑only plugin   | Manual `<script>` for other bundlers           |
| Capture timing     | Triggers on `visibilitychange/pagehide/unload` |
| Full‑page capture  | Snapshotting sub‑trees not supported (yet)     |
| Fixed TTL (7 days) | Override in source; config planned             |

---

## Browser Support

- **Chrome/Edge 111+**: Full (ViewTransition supported)
- **Firefox/Safari**: Core instant replay works; falls back without ViewTransition
- **Mobile**: iOS Safari 16+, Chrome Android 111+

---

## FAQ

**Does this work with SSR/Next.js?**
No. Prepaint targets pure CSR apps. For SSR, use the framework’s SSR/RSC features.

**Will this increase memory usage?**
Snapshots are kept in IndexedDB (disk). Memory overhead during boot is small.

**Can I restrict capture to certain routes?**
Yes. Use `setupCapture({ routes: [...] })` if you manually wire it, or filter at the app layer. The default auto‑capture installed by `createFirstTxRoot` captures all routes.

**How do I prevent duplicate UI?**
Use overlay mode or rely on the built‑in root guard. Overlay paints above your app and avoids writing into `#root`; the guard enforces single‑child `#root`.

---

## License

MIT © [joseph0926](https://github.com/joseph0926)

---

## Links

- Main repository: [https://github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- [`@firsttx/local-first`](../local-first) – Data layer (IndexedDB + React)
- [`@firsttx/tx`](../tx) – Transaction layer (optimistic updates + rollback)
