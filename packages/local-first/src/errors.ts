import type { z } from 'zod';

export abstract class FirstTxError extends Error {
  abstract getUserMessage(): string;
  abstract getDebugInfo(): string;
}

export type StorageErrorCode = 'QUOTA_EXCEEDED' | 'PERMISSION_DENIED' | 'UNKNOWN';

export class StorageError extends FirstTxError {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly recoverable: boolean,
    public readonly context: {
      key: string;
      operation: 'get' | 'set' | 'delete';
      originalError?: Error;
    },
  ) {
    super(message);
    this.name = 'StorageError';
  }

  getUserMessage(): string {
    switch (this.code) {
      case 'QUOTA_EXCEEDED':
        return 'Storage quota exceeded. Please free up space in your browser settings.';
      case 'PERMISSION_DENIED':
        return 'Storage access denied. Please check your browser permissions.';
      default:
        return 'Failed to access storage. Please try again.';
    }
  }

  getDebugInfo(): string {
    return `[${this.code}] ${this.context.operation} "${this.context.key}": ${this.message}`;
  }
}

export function convertDOMException(
  domError: Error,
  context: { key: string; operation: 'get' | 'set' | 'delete' },
): StorageError {
  if (domError.name === 'QuotaExceededError') {
    return new StorageError(
      `[FirstTx] Storage quota exceeded for key "${context.key}"`,
      'QUOTA_EXCEEDED',
      false,
      { ...context, originalError: domError },
    );
  }

  if (domError.name === 'SecurityError' || domError.message.includes('permission')) {
    return new StorageError(
      `[FirstTx] Storage access denied for key "${context.key}"`,
      'PERMISSION_DENIED',
      false,
      { ...context, originalError: domError },
    );
  }

  return new StorageError(
    `[FirstTx] Storage error for key "${context.key}": ${domError.message}`,
    'UNKNOWN',
    true,
    { ...context, originalError: domError },
  );
}

export class ValidationError extends FirstTxError {
  constructor(
    message: string,
    public readonly modelName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  getUserMessage(): string {
    return `Data validation failed for "${this.modelName}". The stored data may be corrupted or outdated.`;
  }

  getDebugInfo(): string {
    const issues = this.zodError.issues
      .map((issue) => {
        return `  - ${issue.path.join('.')}: ${issue.message}`;
      })
      .join('\n');

    return `[ValidationError] Model "${this.modelName}":\n${issues}`;
  }
}
