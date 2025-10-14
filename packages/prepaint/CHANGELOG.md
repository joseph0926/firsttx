# @firsttx/prepaint

## 0.3.1

### Patch Changes

TEST

- hydration failure tests

DOCS

- update README

## 0.3.0

### Minor Changes

**Add overlay mode and hard hydration bailout to prepaint**

This release introduces significant improvements to snapshot capture and hydration reliability:

**Breaking Changes:**

- `captureSnapshot()` now uses root element serialization instead of `body.innerHTML`
- Requires `#root` element to be present for capture to work

**New Features:**

- **Overlay mode support:** Adds global `__FIRSTTX_DEV__` flag for development logging
- **Volatile data handling:** Elements with `data-firsttx-volatile` attribute are automatically cleared during capture (useful for timestamps, random values)
- **Style filtering:** Prepaint-injected styles are now excluded from capture via `data-firsttx-prepaint` attribute
- **Enhanced capture timing:**
  - Captures on `visibilitychange` (when page becomes hidden)
  - Captures on `pagehide` (mobile-friendly)
  - Maintains `beforeunload` capture
  - Debounced with microtask queue to prevent duplicate saves

**Improvements:**

- Cleaner serialization: Only captures first child of root element
- More reliable hydration: Filters out dynamic content that causes mismatches
- Better mobile support: `pagehide` event works more reliably on iOS/Android
- Development experience: `__FIRSTTX_DEV__` replaces `process.env.NODE_ENV` checks

**Migration Guide:**

```tsx
// If you have dynamic content that changes on every render:
<span data-firsttx-volatile>{Date.now()}</span>
<div data-firsttx-volatile>{Math.random()}</div>

// Vite plugin automatically injects __FIRSTTX_DEV__ flag
// No changes needed to your vite.config.ts
```

## 0.2.0

### Minor Changes

Add debug hooks and improve error handling

BREAKING CHANGE: captureSnapshot now returns Promise<Snapshot | null>

Added:

- onCapture/onHandoff callbacks to createFirstTxRoot
- SetupCaptureOptions interface (routes filter, onCapture callback)
- Graceful error handling in captureSnapshot

This allows developers to debug capture lifecycle and filter routes:

```tsx
createFirstTxRoot(root, <App />, {
  onCapture: (s) => console.log('Captured:', s),
  onHandoff: (strategy) => console.log(strategy),
});
```

## 0.1.3

### Patch Changes

- Fix: call boot function in injected script

## 0.1.2

### Patch Changes

- modify the build script to include boot.js in the build

## 0.1.1

### Patch Changes

- fix test and fix some patch bugs

## 0.1.0

### Minor Changes

- First public release of prepaint: Instant page restoration from IndexedDB snapshots / Zero blank-screen time on return visits / Automatic React hydration with ViewTransition support

```

```
