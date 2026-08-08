import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '../src/storage';
import type { StoredModel, TxJournalEntry } from '../src/types';

const DB_NAME = 'firsttx-local-first';

function seedV1Database(key: string, value: StoredModel<unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models');
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
      tx.onerror = () => reject(tx.error ?? new Error('Failed to seed v1 models store'));
    };

    request.onerror = () => reject(request.error ?? new Error('Failed to open v1 database'));
  });
}

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

  describe('v1 -> v2', () => {
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

    it('should upgrade the database to v2 with all stores present', async () => {
      await seedV1Database('legacy-model', { _v: 1, updatedAt: 1000, data: { count: 7 } });

      await storage.get('legacy-model');

      const db = await openRawDatabase();
      const storeNames = Array.from(db.objectStoreNames);
      db.close();

      expect(db.version).toBe(2);
      expect(storeNames).toContain('models');
      expect(storeNames).toContain('tx_journal');
      expect(storeNames).toContain('settings');
    });

    it('should keep models writable after upgrade', async () => {
      await seedV1Database('legacy-model', { _v: 1, updatedAt: 1000, data: { count: 7 } });

      await storage.set('legacy-model', { _v: 1, updatedAt: 2000, data: { count: 8 } });
      const updated = await storage.get<{ count: number }>('legacy-model');

      expect(updated?.data.count).toBe(8);
    });

    it('should expose the new stores to a v1 upgraded database', async () => {
      await seedV1Database('legacy-model', { _v: 1, updatedAt: 1000, data: { count: 7 } });

      await storage.putJournalEntry({
        id: 'tx-1',
        status: 'pending',
        updatedAt: 1000,
        payload: { step: 'charge' },
      });
      await storage.setSetting('debug', true);

      await expect(storage.getJournalEntries()).resolves.toHaveLength(1);
      await expect(storage.getSetting<boolean>('debug')).resolves.toBe(true);
      await expect(storage.get<{ count: number }>('legacy-model')).resolves.toEqual({
        _v: 1,
        updatedAt: 1000,
        data: { count: 7 },
      });
    });
  });

  describe('tx_journal', () => {
    it('should append and read entries', async () => {
      const entry: TxJournalEntry<{ step: string }> = {
        id: 'tx-1',
        status: 'pending',
        updatedAt: 1000,
        payload: { step: 'charge' },
      };

      await storage.putJournalEntry(entry);
      const entries = await storage.getJournalEntries<{ step: string }>();

      expect(entries).toEqual([entry]);
    });

    it('should overwrite an entry with the same id', async () => {
      await storage.putJournalEntry({
        id: 'tx-1',
        status: 'pending',
        updatedAt: 1000,
        payload: null,
      });
      await storage.putJournalEntry({
        id: 'tx-1',
        status: 'committed',
        updatedAt: 2000,
        payload: null,
      });

      const entries = await storage.getJournalEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.status).toBe('committed');
    });

    it('should return an empty list when no entries exist', async () => {
      await expect(storage.getJournalEntries()).resolves.toEqual([]);
    });

    it('should delete an entry', async () => {
      await storage.putJournalEntry({
        id: 'tx-1',
        status: 'pending',
        updatedAt: 1000,
        payload: null,
      });
      await storage.putJournalEntry({
        id: 'tx-2',
        status: 'pending',
        updatedAt: 2000,
        payload: null,
      });

      await storage.deleteJournalEntry('tx-1');
      const entries = await storage.getJournalEntries();

      expect(entries.map((entry) => entry.id)).toEqual(['tx-2']);
    });

    it('should not throw when deleting a non-existent entry', async () => {
      await expect(storage.deleteJournalEntry('missing')).resolves.toBeUndefined();
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
