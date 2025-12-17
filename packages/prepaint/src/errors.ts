import { BaseFirstTxError } from '@firsttx/shared';

export type PrepaintErrorCode =
  | 'BOOT_DB_OPEN'
  | 'BOOT_SNAPSHOT_READ'
  | 'BOOT_DOM_RESTORE'
  | 'BOOT_STYLE_INJECTION'
  | 'CAPTURE_DOM_SERIALIZE'
  | 'CAPTURE_STYLE_COLLECT'
  | 'CAPTURE_DB_WRITE'
  | 'HYDRATION_CONTENT'
  | 'HYDRATION_STRUCTURE'
  | 'HYDRATION_ATTRIBUTE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_PERMISSION_DENIED'
  | 'STORAGE_CORRUPTED_DATA'
  | 'STORAGE_UNKNOWN';

export abstract class PrepaintError extends BaseFirstTxError {
  readonly domain = 'prepaint' as const;
  abstract readonly code: PrepaintErrorCode;
}

export class BootError extends PrepaintError {
  readonly code: PrepaintErrorCode;

  constructor(
    message: string,
    public readonly phase: 'db-open' | 'snapshot-read' | 'dom-restore' | 'style-injection',
    public readonly cause?: Error,
  ) {
    super(message, { phase, cause: cause?.message });
    this.name = 'BootError';
    this.code = `BOOT_${phase.toUpperCase().replace(/-/g, '_')}` as PrepaintErrorCode;
  }

  getUserMessage(): string {
    return 'Page is loading normally. Previous state could not be restored.';
  }

  getDebugInfo(): string {
    const causeInfo = this.cause ? `\nCause: ${this.cause.message}` : '';
    return `[BootError] ${this.phase}: ${this.message}${causeInfo}`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

export class CaptureError extends PrepaintError {
  readonly code: PrepaintErrorCode;

  constructor(
    message: string,
    public readonly phase: 'dom-serialize' | 'style-collect' | 'db-write',
    public readonly route: string,
    public readonly cause?: Error,
  ) {
    super(message, { phase, route, cause: cause?.message });
    this.name = 'CaptureError';
    this.code = `CAPTURE_${phase.toUpperCase().replace(/-/g, '_')}` as PrepaintErrorCode;
  }

  getUserMessage(): string {
    return 'Snapshot capture failed. Next visit will load normally.';
  }

  getDebugInfo(): string {
    let causeInfo = '';
    if (this.cause) {
      if (this.cause instanceof PrepaintStorageError) {
        causeInfo = `\nCause: [${this.cause.code}] ${this.cause.message}`;
      } else {
        causeInfo = `\nCause: ${this.cause.message}`;
      }
    }
    return `[CaptureError] ${this.phase} for route "${this.route}": ${this.message}${causeInfo}`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

export class HydrationError extends PrepaintError {
  readonly code: PrepaintErrorCode;

  constructor(
    message: string,
    public readonly mismatchType: 'content' | 'structure' | 'attribute',
    public readonly cause: Error,
  ) {
    super(message, { mismatchType, cause: cause.message });
    this.name = 'HydrationError';
    this.code = `HYDRATION_${mismatchType.toUpperCase()}` as PrepaintErrorCode;
  }

  getUserMessage(): string {
    return 'Page content has been updated. Loading fresh version.';
  }

  getDebugInfo(): string {
    return `[HydrationError] ${this.mismatchType} mismatch: ${this.message}\nReact error: ${this.cause.message}`;
  }

  isRecoverable(): boolean {
    return true;
  }
}

export type StorageErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'PERMISSION_DENIED'
  | 'CORRUPTED_DATA'
  | 'UNKNOWN';

export class PrepaintStorageError extends PrepaintError {
  readonly code: PrepaintErrorCode;

  constructor(
    message: string,
    public readonly storageCode: StorageErrorCode,
    public readonly operation: 'open' | 'read' | 'write' | 'delete',
    public readonly cause?: Error,
  ) {
    super(message, { storageCode, operation, cause: cause?.message });
    this.name = 'PrepaintStorageError';
    this.code = `STORAGE_${storageCode}` as PrepaintErrorCode;
  }

  getUserMessage(): string {
    switch (this.storageCode) {
      case 'QUOTA_EXCEEDED':
        return 'Browser storage is full. Please free up space to enable instant page loading.';
      case 'PERMISSION_DENIED':
        return 'Storage access denied. Prepaint features are disabled.';
      case 'CORRUPTED_DATA':
        return 'Stored snapshot is corrupted. It will be cleared automatically.';
      default:
        return 'Storage error occurred. Next visit may load slowly.';
    }
  }

  getDebugInfo(): string {
    const causeInfo = this.cause ? `\nCause: ${this.cause.message}` : '';
    return `[PrepaintStorageError] ${this.storageCode} during ${this.operation}: ${this.message}${causeInfo}`;
  }

  isRecoverable(): boolean {
    return this.storageCode !== 'PERMISSION_DENIED';
  }
}

export function convertDOMException(
  domError: Error,
  operation: PrepaintStorageError['operation'],
): PrepaintStorageError {
  if (domError.name === 'QuotaExceededError') {
    return new PrepaintStorageError(
      `Storage quota exceeded during ${operation}`,
      'QUOTA_EXCEEDED',
      operation,
      domError,
    );
  }

  if (domError.name === 'SecurityError' || domError.message.includes('permission')) {
    return new PrepaintStorageError(
      `Storage access denied during ${operation}`,
      'PERMISSION_DENIED',
      operation,
      domError,
    );
  }

  return new PrepaintStorageError(
    `Storage error during ${operation}: ${domError.message}`,
    'UNKNOWN',
    operation,
    domError,
  );
}
