export { BaseFirstTxError } from './errors';
export type { ErrorContext, FirstTxDomain } from './errors';

export {
  supportsViewTransition,
  safeSetInnerHTML,
  sanitizeHTML,
  safePostMessage,
  getCurrentOrigin,
} from './browser';
export type { SanitizeOptions, PostMessageOptions } from './browser';

export { isError, isAbortError, isDOMException, isObject, isNonEmptyString } from './type-guards';

export {
  DEFAULT_TTL_MS,
  DEFAULT_TRANSACTION_TIMEOUT_MS,
  DEFAULT_MAX_BUFFER_SIZE,
  DEFAULT_RETRY_DELAY_MS,
  MAX_SNAPSHOT_AGE_MS,
  DANGEROUS_ATTRIBUTES,
  DANGEROUS_HTML_TAGS,
} from './constants';
