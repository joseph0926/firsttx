# @firsttx/shared

## 0.2.0

### Minor Changes

### Features

- Add `BaseFirstTxError` abstract class for consistent error handling across packages
- Add `sanitizeHTML` and `safeSetInnerHTML` utilities for XSS protection with optional DOMPurify support
- Add `safePostMessage` utility with explicit origin validation
- Add type guard functions: `isError`, `isAbortError`, `isDOMException`, `isObject`, `isNonEmptyString`
- Add shared constants: `DEFAULT_TTL_MS`, `DEFAULT_TRANSACTION_TIMEOUT_MS`, `DEFAULT_MAX_BUFFER_SIZE`
