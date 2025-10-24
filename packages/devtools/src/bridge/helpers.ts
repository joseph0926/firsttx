import { EventPriority } from './types';
import type {
  DevToolsEvent,
  PrepaintCaptureEvent,
  PrepaintRestoreEvent,
  PrepaintHandoffEvent,
  PrepaintHydrationErrorEvent,
  PrepaintStorageErrorEvent,
  ModelInitEvent,
  ModelLoadEvent,
  ModelPatchEvent,
  ModelReplaceEvent,
  ModelSyncStartEvent,
  ModelSyncSuccessEvent,
  ModelSyncErrorEvent,
  ModelBroadcastEvent,
  ModelValidationErrorEvent,
  TxStartEvent,
  TxStepStartEvent,
  TxStepSuccessEvent,
  TxStepRetryEvent,
  TxStepFailEvent,
  TxCommitEvent,
  TxRollbackStartEvent,
  TxRollbackSuccessEvent,
  TxRollbackFailEvent,
  TxTimeoutEvent,
  SystemReadyEvent,
  SystemErrorEvent,
} from './types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPrepaintCaptureEvent(
  data: PrepaintCaptureEvent['data'],
): PrepaintCaptureEvent {
  return {
    id: generateId(),
    category: 'prepaint',
    type: 'capture',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createPrepaintRestoreEvent(
  data: PrepaintRestoreEvent['data'],
): PrepaintRestoreEvent {
  return {
    id: generateId(),
    category: 'prepaint',
    type: 'restore',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createPrepaintHandoffEvent(
  data: PrepaintHandoffEvent['data'],
): PrepaintHandoffEvent {
  return {
    id: generateId(),
    category: 'prepaint',
    type: 'handoff',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createPrepaintHydrationErrorEvent(
  data: PrepaintHydrationErrorEvent['data'],
): PrepaintHydrationErrorEvent {
  return {
    id: generateId(),
    category: 'prepaint',
    type: 'hydration.error',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createPrepaintStorageErrorEvent(
  data: PrepaintStorageErrorEvent['data'],
): PrepaintStorageErrorEvent {
  return {
    id: generateId(),
    category: 'prepaint',
    type: 'storage.error',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createModelInitEvent(data: ModelInitEvent['data']): ModelInitEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'init',
    timestamp: Date.now(),
    priority: EventPriority.LOW,
    data,
  };
}

export function createModelLoadEvent(data: ModelLoadEvent['data']): ModelLoadEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'load',
    timestamp: Date.now(),
    priority: EventPriority.LOW,
    data,
  };
}

export function createModelPatchEvent(data: ModelPatchEvent['data']): ModelPatchEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'patch',
    timestamp: Date.now(),
    priority: EventPriority.LOW,
    data,
  };
}

export function createModelReplaceEvent(data: ModelReplaceEvent['data']): ModelReplaceEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'replace',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createModelSyncStartEvent(data: ModelSyncStartEvent['data']): ModelSyncStartEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'sync.start',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createModelSyncSuccessEvent(
  data: ModelSyncSuccessEvent['data'],
): ModelSyncSuccessEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'sync.success',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createModelSyncErrorEvent(data: ModelSyncErrorEvent['data']): ModelSyncErrorEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'sync.error',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createModelBroadcastEvent(data: ModelBroadcastEvent['data']): ModelBroadcastEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'broadcast',
    timestamp: Date.now(),
    priority: EventPriority.LOW,
    data,
  };
}

export function createModelValidationErrorEvent(
  data: ModelValidationErrorEvent['data'],
): ModelValidationErrorEvent {
  return {
    id: generateId(),
    category: 'model',
    type: 'validation.error',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createTxStartEvent(data: TxStartEvent['data']): TxStartEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'start',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createTxStepStartEvent(data: TxStepStartEvent['data']): TxStepStartEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'step.start',
    timestamp: Date.now(),
    priority: EventPriority.LOW,
    data,
  };
}

export function createTxStepSuccessEvent(data: TxStepSuccessEvent['data']): TxStepSuccessEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'step.success',
    timestamp: Date.now(),
    priority: EventPriority.LOW,
    data,
  };
}

export function createTxStepRetryEvent(data: TxStepRetryEvent['data']): TxStepRetryEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'step.retry',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createTxStepFailEvent(data: TxStepFailEvent['data']): TxStepFailEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'step.fail',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createTxCommitEvent(data: TxCommitEvent['data']): TxCommitEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'commit',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createTxRollbackStartEvent(
  data: TxRollbackStartEvent['data'],
): TxRollbackStartEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'rollback.start',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createTxRollbackSuccessEvent(
  data: TxRollbackSuccessEvent['data'],
): TxRollbackSuccessEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'rollback.success',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createTxRollbackFailEvent(data: TxRollbackFailEvent['data']): TxRollbackFailEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'rollback.fail',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createTxTimeoutEvent(data: TxTimeoutEvent['data']): TxTimeoutEvent {
  return {
    id: generateId(),
    category: 'tx',
    type: 'timeout',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function createSystemReadyEvent(data: SystemReadyEvent['data']): SystemReadyEvent {
  return {
    id: generateId(),
    category: 'system',
    type: 'ready',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data,
  };
}

export function createSystemErrorEvent(data: SystemErrorEvent['data']): SystemErrorEvent {
  return {
    id: generateId(),
    category: 'system',
    type: 'error',
    timestamp: Date.now(),
    priority: EventPriority.HIGH,
    data,
  };
}

export function isPrepaintEvent(
  event: DevToolsEvent,
): event is Extract<DevToolsEvent, { category: 'prepaint' }> {
  return event.category === 'prepaint';
}

export function isModelEvent(
  event: DevToolsEvent,
): event is Extract<DevToolsEvent, { category: 'model' }> {
  return event.category === 'model';
}

export function isTxEvent(
  event: DevToolsEvent,
): event is Extract<DevToolsEvent, { category: 'tx' }> {
  return event.category === 'tx';
}

export function isSystemEvent(
  event: DevToolsEvent,
): event is Extract<DevToolsEvent, { category: 'system' }> {
  return event.category === 'system';
}

export function isErrorEvent(event: DevToolsEvent): boolean {
  return (
    event.type.includes('error') ||
    event.type.includes('fail') ||
    event.type === 'rollback.start' ||
    event.type === 'timeout'
  );
}

export function isHighPriority(event: DevToolsEvent): boolean {
  return event.priority === EventPriority.HIGH;
}
