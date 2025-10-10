# @firsttx/prepaint

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
