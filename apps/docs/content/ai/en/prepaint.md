# Prepaint

## What is Prepaint?

Prepaint solves the blank screen problem on revisit in CSR React applications. It saves the current DOM state to IndexedDB when the user leaves the page, and on the next visit, it displays the stored snapshot immediately before the React bundle is loaded. After React becomes ready, it transitions smoothly to the actual app.

## How it works

### Capture phase

When the user leaves the page (on `visibilitychange`, `pagehide`, or `beforeunload` events), the following steps are executed:

1. Clone the first child DOM node of the `#root` element.
2. Clear the contents of elements with the `data-firsttx-volatile` attribute.
3. Remove values from password fields and elements with the `data-firsttx-sensitive` attribute.
4. Remove inline event handlers (onclick, onload, etc.).
5. Collect stylesheets from the current page.
6. Save the snapshot to IndexedDB.

### Restore phase

On revisit, the boot script injected by the Vite plugin runs:

1. It looks up the snapshot for the current route in IndexedDB.
2. If a snapshot exists and is not older than 7 days, it is immediately inserted into the DOM.
3. Stored styles are applied.
4. The script waits for the React bundle to load.
5. When React is ready, it uses `hydrateRoot` to merge with the actual app.
6. If the browser supports the ViewTransition API, smooth transition effects are applied.

## createFirstTxRoot

In the React entry point, use `createFirstTxRoot` instead of `createRoot`. This function receives both the container and the React element and internally chooses `hydrateRoot` or `createRoot` depending on whether a snapshot has been restored.

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
    onHydrationError: (error) => console.error('Hydration failed:', error),
  }
);
```

| Option             | Type                                  | Default | Description                                                                                     |
| ------------------ | ------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `transition`       | `boolean`                             | `true`  | Whether to use the ViewTransition API                                                           |
| `onCapture`        | `(snapshot: Snapshot) => void`        | -       | Called when snapshot capture is completed                                                       |
| `onHandoff`        | `(strategy: HandoffStrategy) => void` | -       | Called when the handoff strategy is decided. `strategy` is `'has-prepaint'` or `'cold-start'`.  |
| `onHydrationError` | `(error: HydrationError) => void`     | -       | Called when a hydration mismatch occurs. Prepaint automatically falls back to client rendering. |

## Vite plugin

Add the plugin in `vite.config.ts`.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [react(), firstTx()],
});
```

### Plugin options

| Option            | Type                                                   | Default              | Description                                                                                |
| ----------------- | ------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| `inline`          | `boolean`                                              | `true`               | Inlines the boot script into HTML                                                          |
| `minify`          | `boolean`                                              | `true` in production | Whether to minify the boot script. In development, the default is `false`.                 |
| `injectTo`        | `'head' \| 'head-prepend' \| 'body' \| 'body-prepend'` | `'head-prepend'`     | Where to inject the script                                                                 |
| `overlay`         | `boolean`                                              | -                    | Enables overlay mode globally                                                              |
| `overlayRoutes`   | `string[]`                                             | -                    | Restricts overlay display to specified routes                                              |
| `nonce`           | `string \| (() => string)`                             | -                    | CSP nonce value. When provided as a function, a value is generated dynamically per request |
| `devFlagOverride` | `boolean`                                              | -                    | Manually sets the development mode flag. If omitted, it follows Vite’s `mode`.             |

## Handling sensitive data

### Default behavior

Values in password input fields (`input[type="password"]`) and elements with the `data-firsttx-sensitive` attribute are automatically removed from snapshots.

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

The contents of this element are cleared in the snapshot and filled with actual values after React hydration.

## Overlay mode

Overlay mode displays the snapshot in a separate overlay layer instead of inside `#root`. It is useful for visually inspecting snapshot states during development.

### How to enable

You can enable it via `localStorage`:

```typescript
// Enable globally
localStorage.setItem('firsttx:overlay', 'true');

// Enable only on specific routes
localStorage.setItem('firsttx:overlayRoutes', '/dashboard,/settings');
```

Or set it via a global variable:

```typescript
window.__FIRSTTX_OVERLAY__ = true;
```

In overlay mode, the attribute `data-prepaint-overlay="true"` is added to the `<html>` element.

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

- `has-prepaint`: A snapshot has been restored. It uses `hydrateRoot` to merge the existing DOM.
- `cold-start`: No snapshot exists or it has expired. It uses `createRoot` for a fresh render.

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

Prepaint handles all errors internally, and when an error occurs, the app continues to behave like a normal CSR application. User experience is not affected.

### BootError

Occurs when snapshot restoration fails in the boot script. Because it occurs before React is loaded, it cannot be detected via callbacks. Debug information is printed to the console.

### HydrationError

Occurs when a DOM mismatch is detected during React hydration. You can detect it via the `onHydrationError` callback, and Prepaint automatically falls back to client rendering.

### CaptureError

Occurs when snapshot capture fails. It does not affect the next visit.

### PrepaintStorageError

An IndexedDB-related error that includes issues such as storage quota exceeded and permission denied.

For detailed error types, refer to `errors.md`.
