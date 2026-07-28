---
'@firsttx/prepaint': patch
---

Remove the unreachable DOMPurify sanitize path and its helpers. `sanitizeSnapshotHTML`, `safeSetInnerHTML`, and `safeSetInnerHTMLSync` were never exported from the package entry and had no callers, so the optional `dompurify` import could not run. Restore has always used the synchronous built-in sanitizer. Documentation that pointed at `safeSetInnerHTML` and at a `@firsttx/prepaint/boot` subpath — neither of which the package exposes — is corrected.
