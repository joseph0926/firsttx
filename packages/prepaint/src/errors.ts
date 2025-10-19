export abstract class PrepaintError extends Error {
  abstract getUserMessage(): string;
  abstract getDebugInfo(): string;
  abstract isRecoverable(): boolean;
}

export class BootError extends PrepaintError {
  constructor(
    message: string,
    public readonly phase: 'db-open' | 'snapshot-read' | 'dom-restore' | 'style-injection',
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'BootError';
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
  constructor(
    message: string,
    public readonly phase: 'dom-serialize' | 'style-collect' | 'db-write',
    public readonly route: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'CaptureError';
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
  constructor(
    message: string,
    public readonly mismatchType: 'content' | 'structure' | 'attribute',
    public readonly cause: Error,
  ) {
    super(message);
    this.name = 'HydrationError';
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

export class PrepaintStorageError extends PrepaintError {
  constructor(
    message: string,
    public readonly code: 'QUOTA_EXCEEDED' | 'PERMISSION_DENIED' | 'CORRUPTED_DATA' | 'UNKNOWN',
    public readonly operation: 'open' | 'read' | 'write' | 'delete',
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'PrepaintStorageError';
  }

  getUserMessage(): string {
    switch (this.code) {
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
    return `[PrepaintStorageError] ${this.code} during ${this.operation}: ${this.message}${causeInfo}`;
  }

  isRecoverable(): boolean {
    return this.code !== 'PERMISSION_DENIED';
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
