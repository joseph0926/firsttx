import 'fake-indexeddb/auto';
import '@testing-library/react';
import { beforeEach } from 'vitest';
import { Storage } from '../src/storage';

beforeEach(async () => {
  const dbs = await indexedDB.databases();
  await Promise.all(
    dbs
      .filter((db) => db.name?.startsWith('firsttx-'))
      .map(
        (db) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(db.name!);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          }),
      ),
  );
  Storage.setInstance(undefined);
});
