import { useEffect, useRef, useState } from 'react';
import { startTransaction } from '.';

export type UseTxConfig<TVariables, TResult = unknown, TSnapshot = void> = {
  optimistic: (variables: TVariables, signal?: AbortSignal) => Promise<TSnapshot>;
  rollback: (variables: TVariables, snapshot?: TSnapshot) => Promise<void>;
  request: (variables: TVariables, signal?: AbortSignal) => Promise<TResult>;
  transition?: boolean;
  retry?: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: 'linear' | 'exponential';
  };
  onSuccess?: (result: TResult, variables: TVariables, snapshot?: TSnapshot) => void;
  onError?: (error: Error, variables: TVariables) => void;
  cancelOnUnmount?: boolean;
};

export type UseTxResult<TVariables, TResult = unknown> = {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TResult>;
  cancel: () => void;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
};

export function useTx<TVariables, TResult = unknown, TSnapshot = void>(
  config: UseTxConfig<TVariables, TResult, TSnapshot>,
): UseTxResult<TVariables, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const configRef = useRef<UseTxConfig<TVariables, TResult, TSnapshot>>(config);
  configRef.current = config;

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (configRef.current.cancelOnUnmount) {
        isCancelledRef.current = true;
        abortControllerRef.current?.abort();
      }
    };
  }, []);

  const executeTransaction = async (variables: TVariables): Promise<TResult> => {
    if (!isMountedRef.current) {
      throw new Error('Component unmounted');
    }

    isCancelledRef.current = false;
    abortControllerRef.current = new AbortController();

    setIsPending(true);
    setIsError(false);
    setIsSuccess(false);
    setError(null);

    let snapshot: TSnapshot | undefined;

    try {
      const tx = startTransaction({
        transition: configRef.current.transition,
      });

      await tx.run(
        async (signal) => {
          if (isCancelledRef.current) {
            throw new Error('Transaction cancelled');
          }
          snapshot = await configRef.current.optimistic(variables, signal);
        },
        {
          compensate: () => configRef.current.rollback(variables, snapshot),
          signal: abortControllerRef.current?.signal,
        },
      );

      const result = await tx.run(
        (signal) => {
          if (isCancelledRef.current) {
            throw new Error('Transaction cancelled');
          }
          return configRef.current.request(variables, signal);
        },
        {
          retry: configRef.current.retry,
          signal: abortControllerRef.current?.signal,
        },
      );

      await tx.commit();

      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }

      if (isCancelledRef.current) {
        throw new Error('Transaction cancelled');
      }

      setIsSuccess(true);
      configRef.current.onSuccess?.(result as TResult, variables, snapshot);

      return result as TResult;
    } catch (err) {
      const error = err as Error;
      const isCancelled = isCancelledRef.current || error.message === 'Transaction cancelled';
      if (isCancelled) {
        if (isMountedRef.current) {
          setIsPending(false);
        }
        throw new Error('Transaction cancelled');
      }

      if (isMountedRef.current) {
        setIsError(true);
        setError(error);
        configRef.current.onError?.(error, variables);
      }
      throw err;
    } finally {
      if (isMountedRef.current && !isCancelledRef.current) {
        setIsPending(false);
      }
      abortControllerRef.current = null;
    }
  };

  const mutate = (variables: TVariables) => {
    executeTransaction(variables).catch(() => {});
  };

  const mutateAsync = (variables: TVariables): Promise<TResult> => {
    return executeTransaction(variables);
  };

  const cancel = () => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
  };

  return { mutate, mutateAsync, cancel, isPending, isError, isSuccess, error };
}
