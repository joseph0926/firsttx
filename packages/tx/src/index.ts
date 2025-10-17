import { Transaction } from './transaction';
import type { TxOptions } from './types';

export type { TxOptions, TxStatus, StepOptions, RetryConfig } from './types';

export { DEFAULT_RETRY_CONFIG } from './types';

export {
  TxError,
  CompensationFailedError,
  RetryExhaustedError,
  TransactionTimeoutError,
  TransactionStateError,
} from './errors';

/**
 * startTransaction
 *
 * @example
 * ```ts
 * const tx = startTransaction({ id: 'cart-update', transition: true })
 *
 * await tx.run(() => CartModel.patch(...))
 * await tx.run(() => api.post(...))
 * await tx.commit()
 * ```
 */
export function startTransaction(options?: TxOptions): Transaction {
  return new Transaction(options);
}

export type { UseTxConfig, UseTxResult } from './hooks';

export { useTx } from './hooks';
