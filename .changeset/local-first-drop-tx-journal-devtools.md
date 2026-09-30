---
'@firsttx/local-first': minor
---

Remove the transaction journal and the DevTools bridge, and stop depending on `@firsttx/shared`. The IndexedDB schema moves to version 3: the upgrade deletes the unused `tx_journal` object store and keeps `models` and `settings` data untouched. `Storage` no longer exposes `putJournalEntry()`, `getJournalEntries()`, or `deleteJournalEntry()`, and `TxJournalEntry` and `TxJournalStatus` are no longer exported. Model operations no longer emit events to `window.__FIRSTTX_DEVTOOLS__`. `FirstTxError` keeps its public shape (`domain`, `code`, `timestamp`, `context`, `toJSON()`) but no longer extends the shared base class. IndexedDB cannot downgrade a database, so once a client opens the store at version 3, older versions of this package can no longer open it.
