import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventPriority } from '../../src/bridge/types';
import type { DevToolsEvent } from '../../src/bridge/types';
import {
  createPrepaintCaptureEvent,
  createPrepaintRestoreEvent,
  createPrepaintHandoffEvent,
  createPrepaintHydrationErrorEvent,
  createPrepaintStorageErrorEvent,
  createModelInitEvent,
  createModelLoadEvent,
  createModelPatchEvent,
  createModelReplaceEvent,
  createModelSyncStartEvent,
  createModelSyncSuccessEvent,
  createModelSyncErrorEvent,
  createModelBroadcastEvent,
  createModelBroadcastFallbackEvent,
  createModelBroadcastSkippedEvent,
  createModelValidationErrorEvent,
  createTxStartEvent,
  createTxStepStartEvent,
  createTxStepSuccessEvent,
  createTxStepRetryEvent,
  createTxStepFailEvent,
  createTxCommitEvent,
  createTxRollbackStartEvent,
  createTxRollbackSuccessEvent,
  createTxRollbackFailEvent,
  createTxTimeoutEvent,
  createSystemReadyEvent,
  createSystemErrorEvent,
  isPrepaintEvent,
  isModelEvent,
  isTxEvent,
  isSystemEvent,
  isErrorEvent,
  isHighPriority,
} from '../../src/bridge/helpers';

describe('Event Creation Functions', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  describe('Prepaint Events', () => {
    it('should create PrepaintCaptureEvent with correct structure', () => {
      const event = createPrepaintCaptureEvent({
        route: '/home',
        bodySize: 1024,
        styleCount: 5,
        hasVolatile: false,
        duration: 50,
      });

      expect(event.category).toBe('prepaint');
      expect(event.type).toBe('capture');
      expect(event.priority).toBe(EventPriority.NORMAL);
      expect(event.timestamp).toBe(1700000000000);
      expect(event.id).toMatch(/^\d+-[a-z0-9]+$/);
      expect(event.data.route).toBe('/home');
    });

    it('should create PrepaintRestoreEvent with correct structure', () => {
      const event = createPrepaintRestoreEvent({
        route: '/home',
        strategy: 'has-prepaint',
        snapshotAge: 1000,
        restoreDuration: 20,
      });

      expect(event.category).toBe('prepaint');
      expect(event.type).toBe('restore');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create PrepaintHandoffEvent with correct structure', () => {
      const event = createPrepaintHandoffEvent({
        strategy: 'cold-start',
        canHydrate: true,
        timestamp: 1700000000000,
      });

      expect(event.category).toBe('prepaint');
      expect(event.type).toBe('handoff');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create PrepaintHydrationErrorEvent with HIGH priority', () => {
      const event = createPrepaintHydrationErrorEvent({
        error: 'Mismatch detected',
        mismatchType: 'content',
        recovered: false,
        route: '/home',
      });

      expect(event.category).toBe('prepaint');
      expect(event.type).toBe('hydration.error');
      expect(event.priority).toBe(EventPriority.HIGH);
    });

    it('should create PrepaintStorageErrorEvent with HIGH priority', () => {
      const event = createPrepaintStorageErrorEvent({
        operation: 'write',
        code: 'QUOTA_EXCEEDED',
        recoverable: true,
        route: '/home',
      });

      expect(event.category).toBe('prepaint');
      expect(event.type).toBe('storage.error');
      expect(event.priority).toBe(EventPriority.HIGH);
    });
  });

  describe('Model Events', () => {
    it('should create ModelInitEvent with LOW priority', () => {
      const event = createModelInitEvent({
        modelName: 'user',
        ttl: 3600000,
        hasInitialData: true,
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('init');
      expect(event.priority).toBe(EventPriority.LOW);
    });

    it('should create ModelLoadEvent with LOW priority', () => {
      const event = createModelLoadEvent({
        modelName: 'user',
        dataSize: 256,
        age: 5000,
        isStale: false,
        duration: 10,
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('load');
      expect(event.priority).toBe(EventPriority.LOW);
    });

    it('should create ModelPatchEvent with LOW priority', () => {
      const event = createModelPatchEvent({
        modelName: 'user',
        operation: 'update',
        duration: 16,
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('patch');
      expect(event.priority).toBe(EventPriority.LOW);
    });

    it('should create ModelReplaceEvent with NORMAL priority', () => {
      const event = createModelReplaceEvent({
        modelName: 'user',
        dataSize: 512,
        source: 'sync',
        duration: 100,
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('replace');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create ModelSyncStartEvent with NORMAL priority', () => {
      const event = createModelSyncStartEvent({
        modelName: 'user',
        trigger: 'mount',
        currentAge: 5000,
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('sync.start');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create ModelSyncSuccessEvent with NORMAL priority', () => {
      const event = createModelSyncSuccessEvent({
        modelName: 'user',
        duration: 200,
        dataSize: 1024,
        hadChanges: true,
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('sync.success');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create ModelSyncErrorEvent with HIGH priority', () => {
      const event = createModelSyncErrorEvent({
        modelName: 'user',
        error: 'Network error',
        duration: 100,
        willRetry: true,
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('sync.error');
      expect(event.priority).toBe(EventPriority.HIGH);
    });

    it('should create ModelBroadcastEvent with LOW priority', () => {
      const event = createModelBroadcastEvent({
        modelName: 'user',
        operation: 'patch',
        senderId: 'tab-123',
        receivedAt: Date.now(),
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('broadcast');
      expect(event.priority).toBe(EventPriority.LOW);
    });

    it('should create ModelBroadcastFallbackEvent with NORMAL priority', () => {
      const event = createModelBroadcastFallbackEvent({
        reason: 'BroadcastChannel not supported',
        environment: 'browser',
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('broadcast.fallback');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create ModelBroadcastSkippedEvent with LOW priority', () => {
      const event = createModelBroadcastSkippedEvent({
        modelName: 'user',
        operation: 'model-patched',
        reason: 'No other tabs',
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('broadcast.skipped');
      expect(event.priority).toBe(EventPriority.LOW);
    });

    it('should create ModelValidationErrorEvent with HIGH priority', () => {
      const event = createModelValidationErrorEvent({
        modelName: 'user',
        error: 'Invalid email format',
        path: 'email',
      });

      expect(event.category).toBe('model');
      expect(event.type).toBe('validation.error');
      expect(event.priority).toBe(EventPriority.HIGH);
    });
  });

  describe('Tx Events', () => {
    it('should create TxStartEvent with NORMAL priority', () => {
      const event = createTxStartEvent({
        txId: 'tx-123',
        hasTimeout: true,
        timeoutMs: 5000,
        useTransition: false,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('start');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create TxStepStartEvent with LOW priority', () => {
      const event = createTxStepStartEvent({
        txId: 'tx-123',
        stepId: 'step-1',
        stepIndex: 0,
        hasCompensation: true,
        hasRetry: true,
        maxAttempts: 3,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('step.start');
      expect(event.priority).toBe(EventPriority.LOW);
    });

    it('should create TxStepSuccessEvent with LOW priority', () => {
      const event = createTxStepSuccessEvent({
        txId: 'tx-123',
        stepId: 'step-1',
        stepIndex: 0,
        duration: 100,
        attemptNumber: 1,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('step.success');
      expect(event.priority).toBe(EventPriority.LOW);
    });

    it('should create TxStepRetryEvent with NORMAL priority', () => {
      const event = createTxStepRetryEvent({
        txId: 'tx-123',
        stepId: 'step-1',
        stepIndex: 0,
        attemptNumber: 1,
        maxAttempts: 3,
        nextDelayMs: 1000,
        backoffStrategy: 'exponential',
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('step.retry');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create TxStepFailEvent with HIGH priority', () => {
      const event = createTxStepFailEvent({
        txId: 'tx-123',
        stepId: 'step-1',
        stepIndex: 0,
        error: 'Final failure',
        attemptNumber: 3,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('step.fail');
      expect(event.priority).toBe(EventPriority.HIGH);
    });

    it('should create TxCommitEvent with NORMAL priority', () => {
      const event = createTxCommitEvent({
        txId: 'tx-123',
        totalSteps: 3,
        totalDuration: 500,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('commit');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create TxRollbackStartEvent with HIGH priority', () => {
      const event = createTxRollbackStartEvent({
        txId: 'tx-123',
        reason: 'Step failed',
        completedSteps: 2,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('rollback.start');
      expect(event.priority).toBe(EventPriority.HIGH);
    });

    it('should create TxRollbackSuccessEvent with HIGH priority', () => {
      const event = createTxRollbackSuccessEvent({
        txId: 'tx-123',
        compensatedSteps: 2,
        duration: 200,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('rollback.success');
      expect(event.priority).toBe(EventPriority.HIGH);
    });

    it('should create TxRollbackFailEvent with HIGH priority', () => {
      const event = createTxRollbackFailEvent({
        txId: 'tx-123',
        failedCompensations: 1,
        errors: ['Compensation failed'],
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('rollback.fail');
      expect(event.priority).toBe(EventPriority.HIGH);
    });

    it('should create TxTimeoutEvent with HIGH priority', () => {
      const event = createTxTimeoutEvent({
        txId: 'tx-123',
        timeoutMs: 5000,
        elapsedMs: 5100,
      });

      expect(event.category).toBe('tx');
      expect(event.type).toBe('timeout');
      expect(event.priority).toBe(EventPriority.HIGH);
    });
  });

  describe('System Events', () => {
    it('should create SystemReadyEvent with NORMAL priority', () => {
      const event = createSystemReadyEvent({
        version: '1.0.0',
        hasIndexedDB: true,
        hasViewTransition: true,
        hasBroadcastChannel: true,
      });

      expect(event.category).toBe('system');
      expect(event.type).toBe('ready');
      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('should create SystemErrorEvent with HIGH priority', () => {
      const event = createSystemErrorEvent({
        error: 'Critical error',
        stack: 'Error: Critical error\n    at ...',
        context: 'bridge',
      });

      expect(event.category).toBe('system');
      expect(event.type).toBe('error');
      expect(event.priority).toBe(EventPriority.HIGH);
    });
  });
});

describe('Type Guards', () => {
  const createMockEvent = (
    category: string,
    type: string,
    priority = EventPriority.NORMAL,
  ): DevToolsEvent =>
    ({
      id: 'test-id',
      category: category as DevToolsEvent['category'],
      type,
      timestamp: Date.now(),
      priority,
      data: {},
    }) as DevToolsEvent;

  describe('isPrepaintEvent', () => {
    it('should return true for prepaint category events', () => {
      const event = createMockEvent('prepaint', 'capture');
      expect(isPrepaintEvent(event)).toBe(true);
    });

    it('should return false for non-prepaint category events', () => {
      const event = createMockEvent('model', 'init');
      expect(isPrepaintEvent(event)).toBe(false);
    });
  });

  describe('isModelEvent', () => {
    it('should return true for model category events', () => {
      const event = createMockEvent('model', 'init');
      expect(isModelEvent(event)).toBe(true);
    });

    it('should return false for non-model category events', () => {
      const event = createMockEvent('tx', 'start');
      expect(isModelEvent(event)).toBe(false);
    });
  });

  describe('isTxEvent', () => {
    it('should return true for tx category events', () => {
      const event = createMockEvent('tx', 'start');
      expect(isTxEvent(event)).toBe(true);
    });

    it('should return false for non-tx category events', () => {
      const event = createMockEvent('system', 'ready');
      expect(isTxEvent(event)).toBe(false);
    });
  });

  describe('isSystemEvent', () => {
    it('should return true for system category events', () => {
      const event = createMockEvent('system', 'ready');
      expect(isSystemEvent(event)).toBe(true);
    });

    it('should return false for non-system category events', () => {
      const event = createMockEvent('prepaint', 'capture');
      expect(isSystemEvent(event)).toBe(false);
    });
  });

  describe('isErrorEvent', () => {
    it('should return true for events with "error" in type', () => {
      const event = createMockEvent('model', 'sync.error');
      expect(isErrorEvent(event)).toBe(true);
    });

    it('should return true for events with "fail" in type', () => {
      const event = createMockEvent('tx', 'step.fail');
      expect(isErrorEvent(event)).toBe(true);
    });

    it('should return true for rollback.start event', () => {
      const event = createMockEvent('tx', 'rollback.start');
      expect(isErrorEvent(event)).toBe(true);
    });

    it('should return true for timeout event', () => {
      const event = createMockEvent('tx', 'timeout');
      expect(isErrorEvent(event)).toBe(true);
    });

    it('should return false for success events', () => {
      const event = createMockEvent('tx', 'commit');
      expect(isErrorEvent(event)).toBe(false);
    });

    it('should return false for step.start events', () => {
      const event = createMockEvent('tx', 'step.start');
      expect(isErrorEvent(event)).toBe(false);
    });
  });

  describe('isHighPriority', () => {
    it('should return true for HIGH priority events', () => {
      const event = createMockEvent('tx', 'step.fail', EventPriority.HIGH);
      expect(isHighPriority(event)).toBe(true);
    });

    it('should return false for NORMAL priority events', () => {
      const event = createMockEvent('tx', 'commit', EventPriority.NORMAL);
      expect(isHighPriority(event)).toBe(false);
    });

    it('should return false for LOW priority events', () => {
      const event = createMockEvent('model', 'init', EventPriority.LOW);
      expect(isHighPriority(event)).toBe(false);
    });
  });
});
