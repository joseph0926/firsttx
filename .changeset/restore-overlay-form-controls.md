---
'@firsttx/prepaint': minor
---

Keep form controls in the restored overlay so a revisit shows the screen the user actually left, and cut the interaction paths instead of the elements: `href`, `xlink:href`, form submission attributes (`action`, `formaction`, `method`, `formmethod`, `target`, `formtarget`), `autocomplete`, and inline `pointer-events` declarations are now stripped from every snapshot. Snapshot sanitization now removes only tags that execute code or load remote resources.
