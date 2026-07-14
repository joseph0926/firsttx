---
'@firsttx/prepaint': minor
---

Replace legacy cached-DOM hydration with a visual-only overlay handoff. Snapshot restore now leaves the React container untouched, React always mounts with `createRoot()`, and the overlay is removed after the first React commit.

The `overlay`, `overlayRoutes`, and `onHydrationError` options remain accepted as deprecated no-ops for one release. Remove overlay flags from new integrations; use capture and restore route policies to limit eligible routes.
