---
'@firsttx/prepaint': minor
---

Support Vite 8 and ship the boot script prebuilt. The Vite plugin used to bundle the boot script with esbuild during the host app's build, which tied it to an esbuild peer dependency that Vite 8 no longer brings in. The package now builds four boot script variants (development or production, minified or not) at publish time, and the plugin reads the matching one. The `vite` peer range is now `^7.0.0 || ^8.0.0`, and the optional `esbuild` peer dependency is removed. Plugin options and the emitted `firsttx-boot.js` asset are unchanged.
