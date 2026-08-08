---
'@firsttx/local-first': patch
---

Treat falsy primitive values as real data throughout the model lifecycle. `initialData` is typed `T` and the schema may be a primitive, so `0` and `''` are valid inputs, but truthiness checks classified them as "no value": stored falsy data was overwritten by `initialData` on subscribe, the version-reset path dropped falsy `initialData` and returned `null`, `getSyncPromise()` treated a cached falsy value as a cache miss and refetched, `patch()` failed with "no data exists and no initialData provided", and `useSuspenseSyncedModel` suspended forever. All presence checks now compare against `undefined`/`null` explicitly. This also fixes the `version` option: `version: 0` previously disabled the version check entirely and is now honored as a real version, so stored data with a different `_v` is reset. Data this package wrote under `version: 0` was already persisted as `_v: 0` and stays intact.
