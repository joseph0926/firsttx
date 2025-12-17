# @firsttx/shared

## 0.3.0

### Minor Changes

### Added

- `domain` and `code` abstract properties to `BaseFirstTxError` for unified error identification across all packages
- `FirstTxDomain` type export (`'prepaint' | 'local-first' | 'tx' | 'devtools' | 'shared'`)
- `DANGEROUS_ATTRIBUTES` constant export (84 dangerous HTML event handler attributes)
- `DANGEROUS_HTML_TAGS` constant export (15 dangerous HTML tags for sanitization)

### Changed

- `BaseFirstTxError.toJSON()` now includes `domain` and `code` properties in serialized output

## 0.2.3

### Patch Changes

- add repository.url

## 0.2.2

### Patch Changes

- update dependencies

## 0.2.1

### Patch Changes

- update dependencies

## 0.2.0

### Minor Changes

### Features

- Add `BaseFirstTxError` abstract class for consistent error handling across packages
- Add `sanitizeHTML` and `safeSetInnerHTML` utilities for XSS protection with optional DOMPurify support
- Add `safePostMessage` utility with explicit origin validation
- Add type guard functions: `isError`, `isAbortError`, `isDOMException`, `isObject`, `isNonEmptyString`
- Add shared constants: `DEFAULT_TTL_MS`, `DEFAULT_TRANSACTION_TIMEOUT_MS`, `DEFAULT_MAX_BUFFER_SIZE`
