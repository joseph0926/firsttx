import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '../src/storage';
import type { StoredModel } from '../src/types';

const DB_NAME = 'firsttx-local-first';

function seedDatabase(
  version: number,
  storeNames: readonly string[],
  key: string,
  value: StoredModel<unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of storeNames) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('models', 'readwrite');
      tx.objectStore('models').put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error(`Failed to seed v${version} models store`));
    };

    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to open v${version} database`));
  });
}

const seedV1Database = (key: string, value: StoredModel<unknown>) =>
  seedDatabase(1, ['models'], key, value);

const seedV2Database = (key: string, value: StoredModel<unknown>) =>
  seedDatabase(2, ['models', 'tx_journal', 'settings'], key, value);

function openRawDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open database'));
  });
}

describe('Storage schema upgrade', () => {
  let storage: Storage;

  beforeEach(() => {
    Storage.setInstance(undefined);
    storage = Storage.getInstance();
  });

  describe('v1 -> v3', () => {
    it('should preserve existing models data after upgrade', async () => {
      const legacy: StoredModel<{ count: number }> = {
        _v: 1,
        updatedAt: 1000,
        data: { count: 7 },
      };

      await seedV1Database('legacy-model', legacy);

      const result = await storage.get<{ count: number }>('legacy-model');

      expect(result).toEqual(legacy);
    });

    it('should upgrade the database to v3 with models and settings stores', async () => {
      await seedV1Database('legacy-model', { _v: 1, updatedAt: 1000, data: { count: 7 } });

      await storage.get('legacy-model');

      const db = await openRawDatabase();
      const storeNames = Array.from(db.objectStoreNames).sort();
      db.close();

      expect(db.version).toBe(3);
      expect(storeNames).toEqual(['models', 'settings']);
    });

    it('should keep models writable after upgrade', async () => {
      await seedV1Database('legacy-model', { _v: 1, updatedAt: 1000, data: { count: 7 } });

      await storage.set('legacy-model', { _v: 1, updatedAt: 2000, data: { count: 8 } });
      const updated = await storage.get<{ count: number }>('legacy-model');

      expect(updated?.data.count).toBe(8);
    });

    it('should expose the settings store to a v1 upgraded database', async () => {
      await seedV1Database('legacy-model', { _v: 1, updatedAt: 1000, data: { count: 7 } });

      await storage.setSetting('debug', true);

      await expect(storage.getSetting<boolean>('debug')).resolves.toBe(true);
      await expect(storage.get<{ count: number }>('legacy-model')).resolves.toEqual({
        _v: 1,
        updatedAt: 1000,
        data: { count: 7 },
      });
    });
  });

  describe('v2 -> v3', () => {
    it('should drop the unused tx_journal store and keep models', async () => {
      const legacy: StoredModel<{ count: number }> = {
        _v: 1,
        updatedAt: 1000,
        data: { count: 7 },
      };
      await seedV2Database('legacy-model', legacy);

      await expect(storage.get<{ count: number }>('legacy-model')).resolves.toEqual(legacy);

      const db = await openRawDatabase();
      const storeNames = Array.from(db.objectStoreNames).sort();
      db.close();

      expect(db.version).toBe(3);
      expect(storeNames).toEqual(['models', 'settings']);
    });
  });

  describe('settings', () => {
    it('should store and retrieve a value', async () => {
      await storage.setSetting('journal-enabled', true);

      await expect(storage.getSetting<boolean>('journal-enabled')).resolves.toBe(true);
    });

    it('should return null for a missing key', async () => {
      await expect(storage.getSetting('missing')).resolves.toBeNull();
    });

    it('should overwrite an existing value', async () => {
      await storage.setSetting('retention', 10);
      await storage.setSetting('retention', 20);

      await expect(storage.getSetting<number>('retention')).resolves.toBe(20);
    });

    it('should keep settings isolated from models', async () => {
      await storage.setSetting('shared-key', 'setting');
      await storage.set('shared-key', { _v: 1, updatedAt: 1000, data: 'model' });

      await expect(storage.getSetting<string>('shared-key')).resolves.toBe('setting');
      await expect(storage.get<string>('shared-key')).resolves.toEqual({
        _v: 1,
        updatedAt: 1000,
        data: 'model',
      });
    });
  });
});
