import type { z } from 'zod';

export abstract class FirstTxError extends Error {
  abstract getUserMessage(): string;
  abstract getDebugInfo(): string;
}

export type StorageErrorCode = 'QUOTA_EXCEEDED' | 'PERMISSION_DENIED' | 'UNKNOWN';

export type StorageOperation = 'get' | 'set' | 'delete' | 'open';

export type StorageErrorContext = {
  key?: string;
  operation: StorageOperation;
  originalError?: Error;
};

export class StorageError extends FirstTxError {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly recoverable: boolean,
    public readonly context: StorageErrorContext,
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
    const keySuffix = this.context.key ? ` "${this.context.key}"` : '';
    return `[${this.code}] ${this.context.operation}${keySuffix}: ${this.message}`;
  }
}

function describeOperation(context: StorageErrorContext): string {
  if (context.operation === 'open') {
    return 'opening the IndexedDB database';
  }

  if (context.key) {
    return `${context.operation} key "${context.key}"`;
  }

  return `${context.operation} storage entry`;
}

export function convertDOMException(domError: Error, context: StorageErrorContext): StorageError {
  const operationDescription = describeOperation(context);

  if (domError.name === 'QuotaExceededError') {
    return new StorageError(
      `[FirstTx] Storage quota exceeded while ${operationDescription}`,
      'QUOTA_EXCEEDED',
      false,
      { ...context, originalError: domError },
    );
  }

  if (domError.name === 'SecurityError' || domError.message.includes('permission')) {
    return new StorageError(
      `[FirstTx] Storage access denied while ${operationDescription}`,
      'PERMISSION_DENIED',
      false,
      { ...context, originalError: domError },
    );
  }

  return new StorageError(
    `[FirstTx] Storage error while ${operationDescription}: ${domError.message}`,
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
