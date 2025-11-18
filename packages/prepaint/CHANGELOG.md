# @firsttx/prepaint

## 0.5.0

### Minor Changes

- **Security**: Added XSS protection by removing 30 dangerous event handler attributes (onclick, onerror, onload, etc.) during DOM serialization to prevent malicious code execution on snapshot restore
- **Performance**: Optimized stylesheet collection with parallel fetching, reducing load time by ~80% for pages with multiple same-origin stylesheets
- **Reliability**: Improved error recovery with automatic cleanup of corrupted or invalid snapshots from IndexedDB
- **Stability**: Fixed potential race condition in `installRootGuard` where `reset()` failures could cause permanent lockup
- **Developer Experience**: Added DevTools events and console logging when snapshots are skipped due to age limits, improving debugging visibility

## 0.4.2

### Patch Changes

### 🔄 Refactoring

- **SSR Compatibility**: Prevent crashes when using in SSR framework client components ([#7c498ff](commit-hash))

### 🐛 Bug Fixes

- **Node Version**: Fixed compatibility with Node.js version constraints ([#5a28b43](commit-hash))

## 0.4.1

### Patch Changes

**Added**

- DevTools integration: added event emission for debugging and monitoring
  - `capture` events: emitted when snapshot is captured with route, body size, and style count
  - `restore` events: emitted during boot when snapshot is restored with strategy and duration
  - `handoff` events: emitted during React hydration handoff with strategy selection
  - `hydration.error` events: emitted on hydration mismatches with error details and recovery status
  - `storage.error` events: emitted on IndexedDB failures with operation type and recoverability

**Changed**

- Internal: added `emitDevToolsEvent()` calls throughout prepaint lifecycle
- No breaking changes to public API

**Technical**

- Events use priority system (NORMAL for lifecycle, HIGH for errors)
- All events include route context for debugging
- Events are no-op when DevTools extension is not present

## 0.4.0

### Minor Changes

implement structured error handling with custom error classes

BREAKING CHANGE: Error logging format has changed from generic console.error to structured error classes

**Added**

- PrepaintError abstract base class with getUserMessage(), getDebugInfo(), isRecoverable()
- BootError for boot phase failures (db-open, snapshot-read, dom-restore, style-injection)
- CaptureError for capture phase failures (dom-serialize, style-collect, db-write)
- HydrationError for React hydration mismatches (content, attribute, structure)
- PrepaintStorageError for IndexedDB operations (QUOTA_EXCEEDED, PERMISSION_DENIED, UNKNOWN)
- convertDOMException utility to transform DOMExceptions into PrepaintStorageError

**Changed**

- All error paths now use structured error classes instead of generic Error
- Error logs always output (removed **FIRSTTX_DEV** conditional for errors)
- Success logs remain conditional on **FIRSTTX_DEV** flag
- Hydration errors use console.warn instead of console.error
- Updated CreateFirstTxRootOptions.onHydrationError to accept HydrationError type

**Tests**

- Enhanced boot.test.ts with 5 error handling scenarios
- Enhanced capture.test.ts with 7 error handling scenarios
- Added comprehensive error validation (phase, message, recoverability)
- All tests verify structured error output format

This aligns prepaint's error handling with local-first and tx packages,
providing consistent error interfaces across the FirstTx ecosystem while
maintaining the "silent failure" philosophy (errors don't break the app).

## 0.3.2

### Patch Changes

**REFACTOR**

- align stylesheet capture expectations

**FIX**

- defer overlay mount until body exists

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
