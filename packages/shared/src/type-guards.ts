export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isAbortError(value: unknown): value is DOMException {
  if (!(value instanceof DOMException)) return false;
  return value.name === 'AbortError';
}

export function isDOMException(value: unknown): value is DOMException {
  return value instanceof DOMException;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError';
  }
  return false;
}

export function isSecurityError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'SecurityError';
  }
  if (isError(error)) {
    return error.message.toLowerCase().includes('permission');
  }
  return false;
}

export function ensureError(value: unknown): Error {
  if (isError(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error(String(value));
}
