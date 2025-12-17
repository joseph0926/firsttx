import { describe, it, expect } from 'vitest';
import { StorageError, ValidationError, FirstTxError, convertDOMException } from '../src/errors';
import { z } from 'zod';

describe('Errors', () => {
  describe('FirstTxError', () => {
    it('should be abstract base class', () => {
      const storageError = new StorageError('Test error', 'UNKNOWN', true, {
        key: 'test',
        operation: 'get',
      });

      expect(storageError).toBeInstanceOf(FirstTxError);
      expect(storageError).toBeInstanceOf(Error);
    });
  });

  describe('StorageError', () => {
    it('should create QUOTA_EXCEEDED error', () => {
      const error = new StorageError('Quota exceeded', 'QUOTA_EXCEEDED', false, {
        key: 'test-key',
        operation: 'set',
      });

      expect(error.code).toBe('STORAGE_QUOTA_EXCEEDED');
      expect(error.storageCode).toBe('QUOTA_EXCEEDED');
      expect(error.recoverable).toBe(false);
      expect(error.storageContext.key).toBe('test-key');
      expect(error.storageContext.operation).toBe('set');
      expect(error.name).toBe('StorageError');
    });

    it('should provide user-friendly message', () => {
      const quotaError = new StorageError('', 'QUOTA_EXCEEDED', false, {
        key: 'test',
        operation: 'set',
      });
      expect(quotaError.getUserMessage()).toBe(
        'Storage quota exceeded. Please free up space in your browser settings.',
      );

      const permissionError = new StorageError('', 'PERMISSION_DENIED', false, {
        key: 'test',
        operation: 'get',
      });
      expect(permissionError.getUserMessage()).toBe(
        'Storage access denied. Please check your browser permissions.',
      );

      const unknownError = new StorageError('', 'UNKNOWN', true, {
        key: 'test',
        operation: 'delete',
      });
      expect(unknownError.getUserMessage()).toBe('Failed to access storage. Please try again.');
    });

    it('should provide debug info', () => {
      const error = new StorageError('[FirstTx] Test error message', 'QUOTA_EXCEEDED', false, {
        key: 'cart',
        operation: 'set',
      });

      const debugInfo = error.getDebugInfo();
      expect(debugInfo).toContain('QUOTA_EXCEEDED');
      expect(debugInfo).toContain('set');
      expect(debugInfo).toContain('cart');
      expect(debugInfo).toContain('Test error message');
    });

    it('should preserve original error', () => {
      const originalError = new Error('Original DOMException');
      const error = new StorageError('Wrapped', 'UNKNOWN', true, {
        key: 'test',
        operation: 'get',
        originalError,
      });

      expect(error.storageContext.originalError).toBe(originalError);
    });
  });

  describe('convertDOMException', () => {
    it('should convert QuotaExceededError', () => {
      const domError = new Error('Quota exceeded');
      domError.name = 'QuotaExceededError';

      const result = convertDOMException(domError, { key: 'test-key', operation: 'set' });

      expect(result).toBeInstanceOf(StorageError);
      expect(result.code).toBe('STORAGE_QUOTA_EXCEEDED');
      expect(result.storageCode).toBe('QUOTA_EXCEEDED');
      expect(result.recoverable).toBe(false);
      expect(result.storageContext.key).toBe('test-key');
      expect(result.storageContext.operation).toBe('set');
    });

    it('should convert SecurityError', () => {
      const domError = new Error('Permission denied');
      domError.name = 'SecurityError';

      const result = convertDOMException(domError, { key: 'test-key', operation: 'get' });

      expect(result.code).toBe('STORAGE_PERMISSION_DENIED');
      expect(result.storageCode).toBe('PERMISSION_DENIED');
      expect(result.recoverable).toBe(false);
    });

    it('should convert unknown errors to UNKNOWN', () => {
      const domError = new Error('Something went wrong');
      domError.name = 'UnknownError';

      const result = convertDOMException(domError, { key: 'test-key', operation: 'delete' });

      expect(result.code).toBe('STORAGE_UNKNOWN');
      expect(result.storageCode).toBe('UNKNOWN');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with Zod error', () => {
      const schema = z.object({ count: z.number() });
      const parseResult = schema.safeParse({ count: 'invalid' });

      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const error = new ValidationError('Validation failed', 'test-model', parseResult.error);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(FirstTxError);
        expect(error.modelName).toBe('test-model');
        expect(error.zodError).toBe(parseResult.error);
        expect(error.name).toBe('ValidationError');
      }
    });

    it('should provide user-friendly message', () => {
      const schema = z.object({ count: z.number() });
      const parseResult = schema.safeParse({ count: 'invalid' });

      if (!parseResult.success) {
        const error = new ValidationError('', 'cart', parseResult.error);
        expect(error.getUserMessage()).toBe(
          'Data validation failed for "cart". The stored data may be corrupted or outdated.',
        );
      }
    });

    it('should provide detailed debug info', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const parseResult = schema.safeParse({ name: 123, age: 'invalid' });

      if (!parseResult.success) {
        const error = new ValidationError('', 'user', parseResult.error);
        const debugInfo = error.getDebugInfo();

        expect(debugInfo).toContain('ValidationError');
        expect(debugInfo).toContain('user');
        expect(debugInfo).toContain('name');
        expect(debugInfo).toContain('age');
      }
    });
  });
});
