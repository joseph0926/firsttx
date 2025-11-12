export type RetryConfig = {
  /** Maximum number of retry attempts (default: 1) */
  maxAttempts?: number;
  /** Delay between retries in milliseconds (default: 100) */
  delayMs?: number;
  /** Backoff strategy between retries (default: 'exponential') */
  backoff?: 'linear' | 'exponential';
};

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 1,
  delayMs: 100,
  backoff: 'exponential',
} as const;

export const RETRY_PRESETS = {
  default: {
    maxAttempts: 2,
    delayMs: 500,
    backoff: 'exponential' as const,
  },
  aggressive: {
    maxAttempts: 5,
    delayMs: 1000,
    backoff: 'exponential' as const,
  },
  quick: {
    maxAttempts: 1,
    delayMs: 0,
    backoff: 'linear' as const,
  },
} as const;

export type StepOptions = {
  /** Compensation function to run on rollback */
  compensate?: () => Promise<void>;
  /** Retry configuration */
  retry?: RetryConfig;
};

export type TxStep<T = void> = {
  /** Unique step identifier */
  id: string;
  /** Function to execute - optionally receives AbortSignal for cancellation */
  run: (signal?: AbortSignal) => Promise<T>;
  /** Compensation function to run on rollback */
  compensate?: () => Promise<void>;
  /** Retry configuration */
  retry?: RetryConfig;
};

export type TxStatus = 'pending' | 'running' | 'committed' | 'rolled-back' | 'failed';

export type TxOptions = {
  /** Transaction ID (default: auto-generated) */
  id?: string;
  /** Whether to use ViewTransition (default: false) */
  transition?: boolean;
  /** Overall transaction timeout in milliseconds */
  timeout?: number;
};
