# Prepaint

## What is Prepaint?

Prepaint reduces the visible blank interval on revisit in CSR React applications. It saves a DOM snapshot to IndexedDB and can replay that temporary, non-interactive visual cache before the main React bundle starts. Timing depends on the device, snapshot size, and storage state.

## How it works

### Capture phase

During idle time and once more on `visibilitychange` or `pagehide`, the following steps are executed:

1. Clone the first child DOM node of the `#root` element.
2. Clear the contents of elements with the `data-firsttx-volatile` attribute.
3. Remove values from password fields and elements with the `data-firsttx-sensitive` attribute.
4. Remove inline event handlers (onclick, onload, etc.).
5. Collect stylesheets from the current page.
6. Save the snapshot to IndexedDB.

### Restore phase

On revisit, the boot script injected by the Vite plugin runs:

1. It looks up the snapshot for the current route in IndexedDB.
2. If a snapshot exists and is not older than 7 days, it is displayed in a non-interactive Shadow DOM overlay.
3. Stored styles are applied inside the overlay while `#root` remains untouched.
4. The script waits for the React bundle to load.
5. React mounts into an empty root with `createRoot()`.
6. The visual overlay is removed after the first React commit.

## createFirstTxRoot

In the React entry point, use `createFirstTxRoot` instead of calling the root API directly. This function connects snapshot capture, handoff, and a clean React mount.

```typescript
import { createFirstTxRoot } from '@firsttx/prepaint';
import { App } from './App';

createFirstTxRoot(
  document.getElementById('root')!,
  <App />
);
```

### Options

You can pass an options object as the third argument.

```typescript
createFirstTxRoot(
  document.getElementById('root')!,
  <App />,
  {
    transition: true,
    onCapture: (snapshot) => console.log('Captured:', snapshot.route),
    onHandoff: (strategy) => console.log('Strategy:', strategy),
  }
);
```

| Option       | Type                                  | Default | Description                                                                        |
| ------------ | ------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `transition` | `boolean`                             | `true`  | Whether to use the ViewTransition API                                              |
| `onCapture`  | `(snapshot: Snapshot) => void`        | -       | Called when snapshot capture is completed                                          |
| `onHandoff`  | `(strategy: HandoffStrategy) => void` | -       | Called with either `'has-prepaint'` or `'cold-start'` when the strategy is decided |

## Vite plugin

Add the plugin in `vite.config.ts`.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    react(),
    firstTx({
      policy: { routes: ['/dashboard', '/cart'] },
    }),
  ],
});
```

The policy is an exact pathname allowlist shared by capture, restore, and pruning. Missing or empty routes disable Prepaint. Defaults are a 7-day TTL, 1 MiB UTF-8 payload limit, and CSS capture enabled. The boot script is an external `/firsttx-boot.js` asset by default; use `inline: true` only with an intentional CSP hash.

Restored HTML is sanitized, but captured CSS is visual cache data and is not a general CSS sanitization boundary. Set `includeStyles: false` for routes with user-controlled or sensitive CSS.

### Plugin options

| Option            | Type                                                   | Default              | Description                                                                                          |
| ----------------- | ------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------- |
| `inline`          | `boolean`                                              | `false`              | Inlines the boot script into HTML; intended for CSP hash deployments                                 |
| `policy`          | `PrepaintPolicy`                                       | disabled             | Exact routes plus optional TTL, byte limit, and CSS capture settings                                 |
| `minify`          | `boolean`                                              | `true` in production | Whether to minify the boot script. In development, the default is `false`.                           |
| `injectTo`        | `'head' \| 'head-prepend' \| 'body' \| 'body-prepend'` | `'head-prepend'`     | Where to inject the script                                                                           |
| `nonce`           | `string \| (() => string)`                             | -                    | CSP nonce embedded when Vite generates the output; static output cannot create one per HTTP response |
| `devFlagOverride` | `boolean`                                              | -                    | Manually sets the development mode flag. If omitted, it follows Vite’s `mode`.                       |

## Handling sensitive data

### Default behavior

Values in password input fields (`input[type="password"]`) and elements with the `data-firsttx-sensitive` attribute are automatically removed from snapshots.

Other DOM content can remain in IndexedDB for up to 7 days. Only enable capture on non-sensitive routes and mark every sensitive field explicitly.

### Adding custom selectors

You can specify additional selectors using a global variable:

```typescript
window.__FIRSTTX_SENSITIVE_SELECTORS__ = [
  '.credit-card-input',
  '[data-private]',
];
```

### Volatile content

For content that should not be stored in snapshots, such as real-time data, use the `data-firsttx-volatile` attribute:

```tsx
<div data-firsttx-volatile>
  <span>Current visitors: {onlineCount}</span>
</div>
```

The contents of this element are cleared in the snapshot and filled with actual values after the React app mounts.

The previous `overlay` and `overlayRoutes` options remain accepted as deprecated no-ops for one release.

## Visual overlay

Snapshots are always displayed in a non-interactive Shadow DOM overlay outside `#root`. No enablement setting is required.

Previous settings can be removed:

```typescript
localStorage.removeItem('firsttx:overlay');
localStorage.removeItem('firsttx:overlayRoutes');
```

During restore, `data-prepaint-overlay="true"` is added to `<html>` and removed after the first React commit.

## Custom route keys

By default, `window.location.pathname` is used as the key for snapshots. When using dynamic routing, you can specify a custom key:

```typescript
// Static string
window.__FIRSTTX_ROUTE_KEY__ = '/products/detail';

// Function (dynamic calculation)
window.__FIRSTTX_ROUTE_KEY__ = () => {
  const path = window.location.pathname;
  // /products/123 -> /products/:id
  return path.replace(/\/products\/\d+/, '/products/:id');
};
```

## Snapshot storage

Snapshots are stored in the `firsttx-prepaint` database in IndexedDB.

- Database name: `firsttx-prepaint`
- Store name: `snapshots`
- Key: Route path
- Expiration: 7 days

### Snapshot structure

```typescript
interface Snapshot {
  route: string;      // Page path
  body: string;       // Serialized DOM HTML
  timestamp: number;  // Capture time (Unix timestamp)
  styles?: Array<{    // Style information
    type: 'inline' | 'external';
    content?: string;
    href?: string;
  }>;
}
```

## Handoff strategies

`createFirstTxRoot` chooses between two strategies depending on whether a snapshot has been restored:

- `has-prepaint`: A visual overlay has been restored. React mounts into an empty root with `createRoot()`.
- `cold-start`: No snapshot exists or it has expired. React uses the same `createRoot()` path.

You can use the `onHandoff` callback to check which strategy was selected.

## HTML attributes

Prepaint adds state-related HTML attributes to the `<html>` element:

| Attribute                 | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `data-prepaint`           | Indicates that a snapshot has been restored              |
| `data-prepaint-timestamp` | Snapshot capture time (Unix timestamp)                   |
| `data-prepaint-overlay`   | Indicates that the snapshot was restored in overlay mode |

These attributes are automatically removed after React mounts. You can use them in CSS for styling based on snapshot state:

```css
/* Loading indicator shown only while a snapshot is being restored */
html[data-prepaint] .loading-indicator {
  display: block;
}
```

## Browser support

Prepaint uses the following APIs:

- IndexedDB: For snapshot storage
- ViewTransition API (optional): For smooth transition effects

Even in browsers that do not support the ViewTransition API, the core functionality works correctly; only the transition effect is omitted.

## Error handling

Prepaint catches boot and capture errors and attempts to continue with a normal client render. Applications should still observe callbacks and DevTools events.

### BootError

Occurs when snapshot restoration fails in the boot script. Because it occurs before React is loaded, it cannot be detected via callbacks. Debug information is printed to the console.

### HydrationError

Deprecated error type retained for legacy consumers. It is not created by the current restore and handoff path.

### CaptureError

Occurs when snapshot capture fails. It does not affect the next visit.

### PrepaintStorageError

An IndexedDB-related error that includes issues such as storage quota exceeded and permission denied.

For detailed error types, refer to `errors.md`.
