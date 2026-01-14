import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emitTxEvent } from '../src/devtools';

describe('emitTxEvent', () => {
  const originalWindow = globalThis.window;
  let mockEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockEmit = vi.fn();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789abc');
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    delete window.__FIRSTTX_DEVTOOLS__;
  });

  describe('early return conditions', () => {
    it('should return early when window is undefined', () => {
      const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
      // @ts-expect-error - testing undefined window
      delete globalThis.window;

      emitTxEvent('start', {
        txId: 'tx-1',
        hasTimeout: false,
        hasTransition: false,
      });

      expect(mockEmit).not.toHaveBeenCalled();

      if (windowDescriptor) {
        Object.defineProperty(globalThis, 'window', windowDescriptor);
      }
    });

    it('should return early when __FIRSTTX_DEVTOOLS__ is not set', () => {
      delete window.__FIRSTTX_DEVTOOLS__;

      emitTxEvent('start', {
        txId: 'tx-1',
        hasTimeout: false,
        hasTransition: false,
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return early when __FIRSTTX_DEVTOOLS__ is undefined', () => {
      window.__FIRSTTX_DEVTOOLS__ = undefined;

      emitTxEvent('start', {
        txId: 'tx-1',
        hasTimeout: false,
        hasTransition: false,
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return early when api.emit is not a function', () => {
      // @ts-expect-error - testing invalid emit
      window.__FIRSTTX_DEVTOOLS__ = { emit: 'not a function' };

      emitTxEvent('start', {
        txId: 'tx-1',
        hasTimeout: false,
        hasTransition: false,
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return early when api.emit is null', () => {
      // @ts-expect-error - testing null emit
      window.__FIRSTTX_DEVTOOLS__ = { emit: null };

      emitTxEvent('start', {
        txId: 'tx-1',
        hasTimeout: false,
        hasTransition: false,
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      window.__FIRSTTX_DEVTOOLS__ = { emit: mockEmit as (event: unknown) => void };
    });

    it('should emit start event with correct structure', () => {
      emitTxEvent('start', {
        txId: 'tx-1',
        hasTimeout: true,
        timeout: 5000,
        hasTransition: false,
      });

      expect(mockEmit).toHaveBeenCalledWith({
        id: '12345678-1234-1234-1234-123456789abc',
        category: 'tx',
        type: 'start',
        timestamp: 1700000000000,
        data: {
          txId: 'tx-1',
          hasTimeout: true,
          timeout: 5000,
          hasTransition: false,
        },
        priority: 1,
      });
    });

    it('should emit step.start event with priority 0', () => {
      emitTxEvent('step.start', {
        txId: 'tx-1',
        stepIndex: 0,
        hasCompensate: true,
        hasRetry: true,
        maxAttempts: 3,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'step.start',
          priority: 0,
        }),
      );
    });

    it('should emit step.success event with priority 0', () => {
      emitTxEvent('step.success', {
        txId: 'tx-1',
        stepIndex: 0,
        duration: 100,
        attempt: 1,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'step.success',
          priority: 0,
        }),
      );
    });

    it('should emit step.retry event with priority 1', () => {
      emitTxEvent('step.retry', {
        txId: 'tx-1',
        stepIndex: 0,
        attempt: 1,
        maxAttempts: 3,
        error: 'Network error',
        delay: 1000,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'step.retry',
          priority: 1,
        }),
      );
    });

    it('should emit step.fail event with priority 2', () => {
      emitTxEvent('step.fail', {
        txId: 'tx-1',
        stepIndex: 0,
        error: 'Final failure',
        finalAttempt: 3,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'step.fail',
          priority: 2,
        }),
      );
    });

    it('should emit commit event with priority 1', () => {
      emitTxEvent('commit', {
        txId: 'tx-1',
        totalSteps: 3,
        duration: 500,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'commit',
          priority: 1,
        }),
      );
    });

    it('should emit rollback.start event with priority 2', () => {
      emitTxEvent('rollback.start', {
        txId: 'tx-1',
        failedStepIndex: 2,
        error: 'Step failed',
        stepsToCompensate: 2,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rollback.start',
          priority: 2,
        }),
      );
    });

    it('should emit rollback.success event with priority 1', () => {
      emitTxEvent('rollback.success', {
        txId: 'tx-1',
        compensatedSteps: 2,
        duration: 200,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rollback.success',
          priority: 1,
        }),
      );
    });

    it('should emit rollback.fail event with priority 2', () => {
      emitTxEvent('rollback.fail', {
        txId: 'tx-1',
        failedCompensations: 1,
        errors: ['Compensation failed'],
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rollback.fail',
          priority: 2,
        }),
      );
    });

    it('should emit timeout event with priority 2', () => {
      emitTxEvent('timeout', {
        txId: 'tx-1',
        timeoutMs: 5000,
        elapsedMs: 5100,
        completedSteps: 2,
      });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timeout',
          priority: 2,
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should catch emit errors silently in production', () => {
      window.__FIRSTTX_DEVTOOLS__ = {
        emit: () => {
          throw new Error('Emit failed');
        },
      };

      expect(() => {
        emitTxEvent('start', {
          txId: 'tx-1',
          hasTimeout: false,
          hasTransition: false,
        });
      }).not.toThrow();
    });
  });

  describe('priority mapping', () => {
    beforeEach(() => {
      window.__FIRSTTX_DEVTOOLS__ = { emit: mockEmit as (event: unknown) => void };
    });

    it('should use default priority 1 for unknown event types', () => {
      // @ts-expect-error - testing unknown type
      emitTxEvent('unknown.type', { txId: 'tx-1' });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unknown.type',
          priority: 1,
        }),
      );
    });

    it('should correctly map all known priorities', () => {
      const priorityMap = {
        start: 1,
        'step.start': 0,
        'step.success': 0,
        'step.retry': 1,
        'step.fail': 2,
        commit: 1,
        'rollback.start': 2,
        'rollback.success': 1,
        'rollback.fail': 2,
        timeout: 2,
      };

      Object.entries(priorityMap).forEach(([type, expectedPriority]) => {
        mockEmit.mockClear();
        // @ts-expect-error - iterating over all types
        emitTxEvent(type, { txId: 'tx-1' });
        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type,
            priority: expectedPriority,
          }),
        );
      });
    });
  });
});
