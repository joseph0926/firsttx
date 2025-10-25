declare const __FIRSTTX_DEV__: boolean;

interface DevToolsAPI {
  emit: (event: unknown) => void;
}

interface TxStartData {
  txId: string;
  hasTimeout: boolean;
  timeout?: number;
  hasTransition: boolean;
}

interface TxStepStartData {
  txId: string;
  stepIndex: number;
  hasCompensate: boolean;
  hasRetry: boolean;
  maxAttempts?: number;
}

interface TxStepSuccessData {
  txId: string;
  stepIndex: number;
  duration: number;
  attempt: number;
}

interface TxStepRetryData {
  txId: string;
  stepIndex: number;
  attempt: number;
  maxAttempts: number;
  error: string;
  delay: number;
}

interface TxStepFailData {
  txId: string;
  stepIndex: number;
  error: string;
  finalAttempt: number;
}

interface TxCommitData {
  txId: string;
  totalSteps: number;
  duration: number;
}

interface TxRollbackStartData {
  txId: string;
  failedStepIndex: number;
  error: string;
  stepsToCompensate: number;
}

interface TxRollbackSuccessData {
  txId: string;
  compensatedSteps: number;
  duration: number;
}

interface TxRollbackFailData {
  txId: string;
  failedCompensations: number;
  errors: string[];
}

interface TxTimeoutData {
  txId: string;
  timeoutMs: number;
  elapsedMs: number;
  completedSteps: number;
}

const EVENT_PRIORITY: Record<string, number> = {
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

export function emitTxEvent(type: 'start', data: TxStartData): void;
export function emitTxEvent(type: 'step.start', data: TxStepStartData): void;
export function emitTxEvent(type: 'step.success', data: TxStepSuccessData): void;
export function emitTxEvent(type: 'step.retry', data: TxStepRetryData): void;
export function emitTxEvent(type: 'step.fail', data: TxStepFailData): void;
export function emitTxEvent(type: 'commit', data: TxCommitData): void;
export function emitTxEvent(type: 'rollback.start', data: TxRollbackStartData): void;
export function emitTxEvent(type: 'rollback.success', data: TxRollbackSuccessData): void;
export function emitTxEvent(type: 'rollback.fail', data: TxRollbackFailData): void;
export function emitTxEvent(type: 'timeout', data: TxTimeoutData): void;

export function emitTxEvent(type: string, data: unknown): void {
  if (typeof window === 'undefined') return;

  try {
    const api = window.__FIRSTTX_DEVTOOLS__;
    if (!api || typeof api.emit !== 'function') return;

    const event = {
      id: crypto.randomUUID(),
      category: 'tx' as const,
      type,
      timestamp: Date.now(),
      data,
      priority: EVENT_PRIORITY[type] ?? 1,
    };

    api.emit(event);
  } catch (error) {
    if (typeof __FIRSTTX_DEV__ !== 'undefined' && __FIRSTTX_DEV__) {
      console.warn('[FirstTx Tx] DevTools emit failed:', error);
    }
  }
}

declare global {
  interface Window {
    __FIRSTTX_DEVTOOLS__?: DevToolsAPI;
  }
}
