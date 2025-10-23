export type EventCategory = 'prepaint' | 'model' | 'tx' | 'system';

export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
}

export interface BaseEvent {
  id: string;
  category: EventCategory;
  type: string;
  timestamp: number;
  priority: EventPriority;
}

export interface PrepaintCaptureEvent extends BaseEvent {
  category: 'prepaint';
  type: 'capture';
  data: {
    route: string;
    bodySize: number;
    styleCount: number;
    hasVolatile: boolean;
    duration: number;
  };
}

export interface PrepaintRestoreEvent extends BaseEvent {
  category: 'prepaint';
  type: 'restore';
  data: {
    route: string;
    strategy: 'has-prepaint' | 'cold-start';
    snapshotAge: number;
    restoreDuration: number;
  };
}

export interface PrepaintHandoffEvent extends BaseEvent {
  category: 'prepaint';
  type: 'handoff';
  data: {
    strategy: 'has-prepaint' | 'cold-start';
    canHydrate: boolean;
    timestamp: number;
  };
}

export interface PrepaintHydrationErrorEvent extends BaseEvent {
  category: 'prepaint';
  type: 'hydration.error';
  priority: EventPriority.HIGH;
  data: {
    error: string;
    mismatchType: 'content' | 'attribute' | 'structure';
    recovered: boolean;
    route: string;
  };
}

export interface PrepaintStorageErrorEvent extends BaseEvent {
  category: 'prepaint';
  type: 'storage.error';
  priority: EventPriority.HIGH;
  data: {
    operation: 'read' | 'write';
    code: string;
    recoverable: boolean;
    route: string;
  };
}

export type PrepaintEvent =
  | PrepaintCaptureEvent
  | PrepaintRestoreEvent
  | PrepaintHandoffEvent
  | PrepaintHydrationErrorEvent
  | PrepaintStorageErrorEvent;

export interface ModelInitEvent extends BaseEvent {
  category: 'model';
  type: 'init';
  data: {
    modelName: string;
    ttl: number;
    hasInitialData: boolean;
    version?: number;
  };
}

export interface ModelLoadEvent extends BaseEvent {
  category: 'model';
  type: 'load';
  data: {
    modelName: string;
    dataSize: number;
    age: number;
    isStale: boolean;
    duration: number;
  };
}

export interface ModelPatchEvent extends BaseEvent {
  category: 'model';
  type: 'patch';
  data: {
    modelName: string;
    operation: string;
    duration: number;
  };
}

export interface ModelReplaceEvent extends BaseEvent {
  category: 'model';
  type: 'replace';
  data: {
    modelName: string;
    dataSize: number;
    source: 'sync' | 'broadcast' | 'manual';
    duration: number;
  };
}

export interface ModelSyncStartEvent extends BaseEvent {
  category: 'model';
  type: 'sync.start';
  data: {
    modelName: string;
    trigger: 'mount' | 'manual' | 'stale';
    currentAge: number;
  };
}

export interface ModelSyncSuccessEvent extends BaseEvent {
  category: 'model';
  type: 'sync.success';
  data: {
    modelName: string;
    dataSize: number;
    duration: number;
    hadChanges: boolean;
  };
}

export interface ModelSyncErrorEvent extends BaseEvent {
  category: 'model';
  type: 'sync.error';
  priority: EventPriority.HIGH;
  data: {
    modelName: string;
    error: string;
    duration: number;
    willRetry: boolean;
  };
}

export interface ModelBroadcastEvent extends BaseEvent {
  category: 'model';
  type: 'broadcast';
  data: {
    modelName: string;
    operation: 'patch' | 'replace';
    senderId: string;
    receivedAt: number;
  };
}

export interface ModelValidationErrorEvent extends BaseEvent {
  category: 'model';
  type: 'validation.error';
  priority: EventPriority.HIGH;
  data: {
    modelName: string;
    error: string;
    path?: string;
  };
}

export type ModelEvent =
  | ModelInitEvent
  | ModelLoadEvent
  | ModelPatchEvent
  | ModelReplaceEvent
  | ModelSyncStartEvent
  | ModelSyncSuccessEvent
  | ModelSyncErrorEvent
  | ModelBroadcastEvent
  | ModelValidationErrorEvent;

export interface TxStartEvent extends BaseEvent {
  category: 'tx';
  type: 'start';
  data: {
    txId: string;
    hasTimeout: boolean;
    timeoutMs?: number;
    useTransition: boolean;
  };
}

export interface TxStepStartEvent extends BaseEvent {
  category: 'tx';
  type: 'step.start';
  data: {
    txId: string;
    stepId: string;
    stepIndex: number;
    hasCompensation: boolean;
    hasRetry: boolean;
    maxAttempts?: number;
  };
}

export interface TxStepSuccessEvent extends BaseEvent {
  category: 'tx';
  type: 'step.success';
  data: {
    txId: string;
    stepId: string;
    stepIndex: number;
    duration: number;
    attemptNumber: number;
  };
}

export interface TxStepRetryEvent extends BaseEvent {
  category: 'tx';
  type: 'step.retry';
  data: {
    txId: string;
    stepId: string;
    stepIndex: number;
    attemptNumber: number;
    maxAttempts: number;
    nextDelayMs: number;
    backoffStrategy: 'exponential' | 'linear';
  };
}

export interface TxStepFailEvent extends BaseEvent {
  category: 'tx';
  type: 'step.fail';
  priority: EventPriority.HIGH;
  data: {
    txId: string;
    stepId: string;
    stepIndex: number;
    error: string;
    attemptNumber: number;
  };
}

export interface TxCommitEvent extends BaseEvent {
  category: 'tx';
  type: 'commit';
  data: {
    txId: string;
    totalSteps: number;
    totalDuration: number;
  };
}

export interface TxRollbackStartEvent extends BaseEvent {
  category: 'tx';
  type: 'rollback.start';
  priority: EventPriority.HIGH;
  data: {
    txId: string;
    reason: string;
    completedSteps: number;
  };
}

export interface TxRollbackSuccessEvent extends BaseEvent {
  category: 'tx';
  type: 'rollback.success';
  priority: EventPriority.HIGH;
  data: {
    txId: string;
    compensatedSteps: number;
    duration: number;
  };
}

export interface TxRollbackFailEvent extends BaseEvent {
  category: 'tx';
  type: 'rollback.fail';
  priority: EventPriority.HIGH;
  data: {
    txId: string;
    failedCompensations: number;
    errors: string[];
  };
}

export interface TxTimeoutEvent extends BaseEvent {
  category: 'tx';
  type: 'timeout';
  priority: EventPriority.HIGH;
  data: {
    txId: string;
    timeoutMs: number;
    elapsedMs: number;
  };
}

export type TxEvent =
  | TxStartEvent
  | TxStepStartEvent
  | TxStepSuccessEvent
  | TxStepRetryEvent
  | TxStepFailEvent
  | TxCommitEvent
  | TxRollbackStartEvent
  | TxRollbackSuccessEvent
  | TxRollbackFailEvent
  | TxTimeoutEvent;

export interface SystemReadyEvent extends BaseEvent {
  category: 'system';
  type: 'ready';
  data: {
    version: string;
    hasIndexedDB: boolean;
    hasViewTransition: boolean;
    hasBroadcastChannel: boolean;
  };
}

export interface SystemErrorEvent extends BaseEvent {
  category: 'system';
  type: 'error';
  priority: EventPriority.HIGH;
  data: {
    error: string;
    stack?: string;
    context?: string;
  };
}

export type SystemEvent = SystemReadyEvent | SystemErrorEvent;

export type DevToolsEvent = PrepaintEvent | ModelEvent | TxEvent | SystemEvent;

export type CommandType =
  | 'ping'
  | 'getState'
  | 'clearSnapshots'
  | 'forceSync'
  | 'clearModel'
  | 'triggerCapture'
  | 'getModelData'
  | 'getTxHistory';

export interface BaseCommand {
  id: string;
  type: CommandType;
  timestamp: number;
}

export interface PingCommand extends BaseCommand {
  type: 'ping';
}

export interface GetStateCommand extends BaseCommand {
  type: 'getState';
}

export interface ClearSnapshotsCommand extends BaseCommand {
  type: 'clearSnapshots';
}

export interface ForceSyncCommand extends BaseCommand {
  type: 'forceSync';
  data: {
    modelName: string;
  };
}

export interface ClearModelCommand extends BaseCommand {
  type: 'clearModel';
  data: {
    modelName: string;
  };
}

export interface TriggerCaptureCommand extends BaseCommand {
  type: 'triggerCapture';
}

export interface GetModelDataCommand extends BaseCommand {
  type: 'getModelData';
  data: {
    modelName: string;
  };
}

export interface GetTxHistoryCommand extends BaseCommand {
  type: 'getTxHistory';
  data?: {
    txId?: string;
    limit?: number;
  };
}

export type DevToolsCommand =
  | PingCommand
  | GetStateCommand
  | ClearSnapshotsCommand
  | ForceSyncCommand
  | ClearModelCommand
  | TriggerCaptureCommand
  | GetModelDataCommand
  | GetTxHistoryCommand;

export interface CommandResponse<T = unknown> {
  commandId: string;
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface DevToolsBridge {
  emit(event: DevToolsEvent): void;
  onCommand(handler: (command: DevToolsCommand) => Promise<CommandResponse>): () => void;
  isConnected(): boolean;
  getBufferedEvents(): DevToolsEvent[];
  clearBuffer(): void;
}

export interface BridgeConfig {
  maxBufferSize?: number;
  persistHighPriority?: boolean;
  normalBatchInterval?: number;
  lowBatchInterval?: number;
  debug?: boolean;
}
