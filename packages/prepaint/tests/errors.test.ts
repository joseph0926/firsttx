import { describe, it, expect } from 'vitest';
import { BootError, PrepaintError, PrepaintStorageError } from '../src/errors';

describe('PrepaintError', () => {
  it('should keep the prototype chain for subclasses', () => {
    const error = new BootError('Failed to open', 'db-open');

    expect(error).toBeInstanceOf(BootError);
    expect(error).toBeInstanceOf(PrepaintError);
    expect(error).toBeInstanceOf(Error);
    expect(error.domain).toBe('prepaint');
  });

  it('should record context and creation time', () => {
    const before = Date.now();
    const error = new BootError('Failed to read', 'snapshot-read', new Error('boom'));
    const after = Date.now();

    expect(error.context).toEqual({ phase: 'snapshot-read', cause: 'boom' });
    expect(error.timestamp).toBeGreaterThanOrEqual(before);
    expect(error.timestamp).toBeLessThanOrEqual(after);
  });

  it('should serialize to JSON with recoverability', () => {
    const error = new PrepaintStorageError('Denied', 'PERMISSION_DENIED', 'open');

    expect(error.toJSON()).toEqual({
      name: 'PrepaintStorageError',
      domain: 'prepaint',
      code: 'STORAGE_PERMISSION_DENIED',
      message: 'Denied',
      timestamp: error.timestamp,
      context: { storageCode: 'PERMISSION_DENIED', operation: 'open', cause: undefined },
      recoverable: false,
    });
  });
});

describe('PrepaintStorageError', () => {
  it.each([
    ['QUOTA_EXCEEDED', /storage is full/i],
    ['PERMISSION_DENIED', /access denied/i],
    ['CORRUPTED_DATA', /corrupted/i],
    ['UNKNOWN', /storage error occurred/i],
  ] as const)('should explain %s to users', (storageCode, message) => {
    const error = new PrepaintStorageError('Storage failed', storageCode, 'write');

    expect(error.getUserMessage()).toMatch(message);
  });

  it('should treat only permission errors as unrecoverable', () => {
    expect(new PrepaintStorageError('x', 'QUOTA_EXCEEDED', 'write').isRecoverable()).toBe(true);
    expect(new PrepaintStorageError('x', 'PERMISSION_DENIED', 'open').isRecoverable()).toBe(false);
  });
});
