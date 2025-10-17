import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineModel } from '../src/model';
import { Storage } from '../src/storage';

describe('defineModel - optional TTL', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  it('should use default TTL (5 minutes) when not specified', () => {
    const model = defineModel('test-default', {
      schema: z.object({ value: z.string() }),
    });

    expect(model.ttl).toBe(5 * 60 * 1000);
  });

  it('should use explicit TTL when provided', () => {
    const model = defineModel('test-explicit', {
      schema: z.object({ value: z.string() }),
      ttl: 10000,
    });

    expect(model.ttl).toBe(10000);
  });

  it('should calculate isStale based on TTL', async () => {
    const model = defineModel('test-stale', {
      schema: z.object({ value: z.string() }),
      version: 1,
      initialData: { value: 'test' },
      ttl: 100,
    });

    await model.replace({ value: 'test' });

    let history = await model.getHistory();
    expect(history.isStale).toBe(false);

    await new Promise((r) => setTimeout(r, 150));

    history = await model.getHistory();
    expect(history.isStale).toBe(true);
  });

  it('should handle Infinity TTL (never expires)', async () => {
    const model = defineModel('test-infinity', {
      schema: z.object({ value: z.string() }),
      version: 1,
      initialData: { value: 'test' },
      ttl: Infinity,
    });

    await model.replace({ value: 'test' });

    await new Promise((r) => setTimeout(r, 100));

    const history = await model.getHistory();
    expect(history.isStale).toBe(false);
  });

  it('should handle 0 TTL (always stale)', async () => {
    const model = defineModel('test-zero', {
      schema: z.object({ value: z.string() }),
      version: 1,
      initialData: { value: 'test' },
      ttl: 0,
    });

    await model.replace({ value: 'test' });

    const history = await model.getHistory();
    expect(history.isStale).toBe(true);
  });

  it('should work with version and initialData without TTL', async () => {
    const model = defineModel('test-version', {
      schema: z.object({ count: z.number() }),
      version: 1,
      initialData: { count: 0 },
    });

    expect(model.ttl).toBe(5 * 60 * 1000);

    await model.replace({ count: 42 });
    const data = await model.getSnapshot();

    expect(data).toEqual({ count: 42 });
  });
});
