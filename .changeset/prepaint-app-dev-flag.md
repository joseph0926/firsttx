---
'@firsttx/prepaint': patch
---

Make development logs from the app-side runtime work and strip them from production bundles. The Vite plugin only defined `__FIRSTTX_DEV__` for the boot script, so the handoff and capture modules inside the app bundle never saw it: their development logs did not print in dev, and their log strings stayed in production bundles. The plugin now adds a `define` for the app bundle through the `config` hook, using the same rule as the boot script (`devFlagOverride`, otherwise `mode === 'development'`). Because Vite does not apply custom `define` values to pre-bundled dependencies on the dev server, the dev server boot script also sets `globalThis.__FIRSTTX_DEV__` before the app's module scripts run. You no longer need to declare `__FIRSTTX_DEV__` yourself.
