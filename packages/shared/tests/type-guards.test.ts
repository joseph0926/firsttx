import { describe, it, expect } from 'vitest';
import {
  isError,
  isAbortError,
  isDOMException,
  isObject,
  isNonEmptyString,
  isQuotaExceededError,
  isSecurityError,
  ensureError,
} from '../src/type-guards';

describe('type-guards', () => {
  describe('isError', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('type error'))).toBe(true);
      expect(isError(new RangeError('range error'))).toBe(true);
      expect(isError(new SyntaxError('syntax error'))).toBe(true);
    });

    it('should return false for non-Error values', () => {
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError('error string')).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError({})).toBe(false);
      expect(isError({ message: 'fake error' })).toBe(false);
    });

    it('should return true for custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      expect(isError(new CustomError('custom'))).toBe(true);
    });
  });

  describe('isAbortError', () => {
    it('should return true for AbortError DOMException', () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      expect(isAbortError(abortError)).toBe(true);
    });

    it('should return false for other DOMException types', () => {
      const notAbort = new DOMException('Not abort', 'NotFoundError');
      expect(isAbortError(notAbort)).toBe(false);
    });

    it('should return false for non-DOMException', () => {
      expect(isAbortError(new Error('Aborted'))).toBe(false);
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError('AbortError')).toBe(false);
      expect(isAbortError({ name: 'AbortError' })).toBe(false);
    });
  });

  describe('isDOMException', () => {
    it('should return true for DOMException instances', () => {
      expect(isDOMException(new DOMException('test'))).toBe(true);
      expect(isDOMException(new DOMException('abort', 'AbortError'))).toBe(true);
      expect(isDOMException(new DOMException('quota', 'QuotaExceededError'))).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isDOMException(new Error('not DOM'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isDOMException(null)).toBe(false);
      expect(isDOMException(undefined)).toBe(false);
      expect(isDOMException('DOMException')).toBe(false);
      expect(isDOMException({})).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject({ nested: { deep: true } })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
      expect(isObject(['a', 'b'])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(Symbol('test'))).toBe(false);
      expect(isObject(BigInt(123))).toBe(false);
    });

    it('should return true for object instances', () => {
      expect(isObject(new Date())).toBe(true);
      expect(isObject(new Error())).toBe(true);
      expect(isObject(/regex/)).toBe(true);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
      expect(isNonEmptyString('multiple words')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for whitespace-only strings', () => {
      expect(isNonEmptyString(' ')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString('\t')).toBe(false);
      expect(isNonEmptyString('\n')).toBe(false);
      expect(isNonEmptyString(' \t\n ')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString(['a'])).toBe(false);
    });

    it('should return true for strings with leading/trailing spaces but content', () => {
      expect(isNonEmptyString('  hello  ')).toBe(true);
      expect(isNonEmptyString('\thello\t')).toBe(true);
    });
  });

  describe('isQuotaExceededError', () => {
    it('should return true for QuotaExceededError DOMException', () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      expect(isQuotaExceededError(quotaError)).toBe(true);
    });

    it('should return false for other DOMException types', () => {
      const otherError = new DOMException('Other', 'NotFoundError');
      expect(isQuotaExceededError(otherError)).toBe(false);
    });

    it('should return false for regular Error', () => {
      expect(isQuotaExceededError(new Error('Quota exceeded'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isQuotaExceededError(null)).toBe(false);
      expect(isQuotaExceededError('QuotaExceededError')).toBe(false);
      expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(false);
    });
  });

  describe('isSecurityError', () => {
    it('should return true for SecurityError DOMException', () => {
      const securityError = new DOMException('Security violation', 'SecurityError');
      expect(isSecurityError(securityError)).toBe(true);
    });

    it('should return false for other DOMException types', () => {
      const otherError = new DOMException('Other', 'AbortError');
      expect(isSecurityError(otherError)).toBe(false);
    });

    it('should return true for Error with permission in message', () => {
      expect(isSecurityError(new Error('Permission denied'))).toBe(true);
      expect(isSecurityError(new Error('No PERMISSION to access'))).toBe(true);
      expect(isSecurityError(new Error('permission issue'))).toBe(true);
    });

    it('should return false for Error without permission in message', () => {
      expect(isSecurityError(new Error('Access denied'))).toBe(false);
      expect(isSecurityError(new Error('Not allowed'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isSecurityError(null)).toBe(false);
      expect(isSecurityError('SecurityError')).toBe(false);
      expect(isSecurityError({ name: 'SecurityError' })).toBe(false);
    });
  });

  describe('ensureError', () => {
    it('should return Error as-is', () => {
      const original = new Error('original');
      const result = ensureError(original);

      expect(result).toBe(original);
    });

    it('should wrap string in Error', () => {
      const result = ensureError('string message');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string message');
    });

    it('should wrap other types using String()', () => {
      expect(ensureError(123).message).toBe('123');
      expect(ensureError(true).message).toBe('true');
      expect(ensureError(null).message).toBe('null');
      expect(ensureError(undefined).message).toBe('undefined');
    });

    it('should wrap objects using String()', () => {
      const result = ensureError({ key: 'value' });
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('[object Object]');
    });

    it('should preserve Error subclasses', () => {
      const typeError = new TypeError('type');
      const result = ensureError(typeError);

      expect(result).toBe(typeError);
      expect(result).toBeInstanceOf(TypeError);
    });

    it('should preserve DOMException', () => {
      const domError = new DOMException('dom', 'AbortError');
      const result = ensureError(domError);

      expect(result).toBe(domError);
      expect(result).toBeInstanceOf(DOMException);
    });
  });
});
