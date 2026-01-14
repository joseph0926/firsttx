import { describe, it, expect } from 'vitest';
import { BaseFirstTxError, type ErrorContext, type FirstTxDomain } from '../src/errors';

class TestError extends BaseFirstTxError {
  readonly domain: FirstTxDomain = 'shared';
  readonly code: string = 'TEST_ERROR';

  constructor(message: string, context?: ErrorContext) {
    super(message, context);
    this.name = 'TestError';
  }

  getUserMessage(): string {
    return 'A test error occurred.';
  }

  getDebugInfo(): string {
    return `[TestError] ${this.message} | context: ${JSON.stringify(this.context)}`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

class NonRecoverableError extends BaseFirstTxError {
  readonly domain: FirstTxDomain = 'prepaint';
  readonly code: string = 'FATAL_ERROR';

  getUserMessage(): string {
    return 'A fatal error occurred.';
  }

  getDebugInfo(): string {
    return `[FatalError] ${this.message}`;
  }

  isRecoverable(): boolean {
    return false;
  }
}

describe('BaseFirstTxError', () => {
  describe('constructor', () => {
    it('should create error with message', () => {
      const error = new TestError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseFirstTxError);
    });

    it('should create error with context', () => {
      const context: ErrorContext = { userId: 123, action: 'save' };
      const error = new TestError('Failed to save', context);

      expect(error.context).toEqual(context);
      expect(error.context?.userId).toBe(123);
      expect(error.context?.action).toBe('save');
    });

    it('should set timestamp on creation', () => {
      const before = Date.now();
      const error = new TestError('Test');
      const after = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    it('should allow undefined context', () => {
      const error = new TestError('No context');

      expect(error.context).toBeUndefined();
    });
  });

  describe('abstract properties', () => {
    it('should have domain property', () => {
      const error = new TestError('Test');

      expect(error.domain).toBe('shared');
    });

    it('should have code property', () => {
      const error = new TestError('Test');

      expect(error.code).toBe('TEST_ERROR');
    });

    it('should support different domains', () => {
      const sharedError = new TestError('Test');
      const prepaintError = new NonRecoverableError('Fatal');

      expect(sharedError.domain).toBe('shared');
      expect(prepaintError.domain).toBe('prepaint');
    });
  });

  describe('abstract methods', () => {
    it('should return user-friendly message', () => {
      const error = new TestError('Internal details');

      expect(error.getUserMessage()).toBe('A test error occurred.');
    });

    it('should return debug info', () => {
      const error = new TestError('Debug info test', { key: 'value' });
      const debugInfo = error.getDebugInfo();

      expect(debugInfo).toContain('TestError');
      expect(debugInfo).toContain('Debug info test');
      expect(debugInfo).toContain('key');
    });

    it('should indicate recoverability', () => {
      const recoverableError = new TestError('Recoverable');
      const fatalError = new NonRecoverableError('Fatal');

      expect(recoverableError.isRecoverable()).toBe(true);
      expect(fatalError.isRecoverable()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const context: ErrorContext = { attempt: 1 };
      const error = new TestError('Serialization test', context);
      const json = error.toJSON();

      expect(json.name).toBe('TestError');
      expect(json.domain).toBe('shared');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Serialization test');
      expect(json.context).toEqual(context);
      expect(json.recoverable).toBe(true);
      expect(typeof json.timestamp).toBe('number');
    });

    it('should include recoverable status', () => {
      const recoverableJson = new TestError('Test').toJSON();
      const fatalJson = new NonRecoverableError('Fatal').toJSON();

      expect(recoverableJson.recoverable).toBe(true);
      expect(fatalJson.recoverable).toBe(false);
    });

    it('should be JSON.stringify compatible', () => {
      const error = new TestError('Stringify test', { data: 'test' });
      const jsonString = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(jsonString) as ReturnType<typeof error.toJSON>;

      expect(parsed.message).toBe('Stringify test');
      expect(parsed.context?.data).toBe('test');
    });
  });

  describe('prototype chain', () => {
    it('should maintain correct prototype chain', () => {
      const error = new TestError('Prototype test');

      expect(Object.getPrototypeOf(error)).toBe(TestError.prototype);
      expect(error instanceof TestError).toBe(true);
      expect(error instanceof BaseFirstTxError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should have correct name property', () => {
      const error = new TestError('Name test');

      expect(error.name).toBe('TestError');
    });
  });

  describe('error types', () => {
    it('should support all FirstTxDomain types', () => {
      const domains: FirstTxDomain[] = ['prepaint', 'local-first', 'tx', 'devtools', 'shared'];

      domains.forEach((domain) => {
        class DomainError extends BaseFirstTxError {
          readonly domain: FirstTxDomain = domain;
          readonly code = 'TEST';
          getUserMessage() {
            return '';
          }
          getDebugInfo() {
            return '';
          }
          isRecoverable() {
            return true;
          }
        }

        const error = new DomainError('Test');
        expect(error.domain).toBe(domain);
      });
    });
  });
});
