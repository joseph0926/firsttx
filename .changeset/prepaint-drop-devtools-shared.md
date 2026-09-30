---
'@firsttx/prepaint': minor
---

Remove the DevTools bridge and stop depending on `@firsttx/shared`. Capture, restore, handoff, and storage errors no longer emit events to `window.__FIRSTTX_DEVTOOLS__`. `PrepaintError` keeps its public shape (`domain`, `code`, `timestamp`, `context`, `toJSON()`) but no longer extends the shared base class.
