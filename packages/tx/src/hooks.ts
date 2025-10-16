import { useEffect, useRef, useState } from 'react';
import { startTransaction } from '.';

export type UseTxConfig<TVariables, TResult = unknown> = {
  optimistic: (variables: TVariables) => Promise<void>;
  rollback: (variables: TVariables) => Promise<void>;
  request: (variables: TVariables) => Promise<TResult>;
  transition?: boolean;
  retry?: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: 'linear' | 'exponential';
  };
  onSuccess?: (result: TResult, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
};

export type UseTxResult<TVariables, TResult = unknown> = {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
};

export function useTx<TVariables, TResult = unknown>(
  config: UseTxConfig<TVariables, TResult>,
): UseTxResult<TVariables, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const configRef = useRef<UseTxConfig<TVariables, TResult>>(config);
  configRef.current = config;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeTransaction = async (variables: TVariables): Promise<TResult> => {
    if (!isMountedRef.current) {
      throw new Error('Component unmounted');
    }

    setIsPending(true);
    setIsError(false);
    setIsSuccess(false);
    setError(null);

    try {
      const tx = startTransaction({
        transition: configRef.current.transition,
      });

      await tx.run(() => configRef.current.optimistic(variables), {
        compensate: () => configRef.current.rollback(variables),
      });

      const result = await tx.run(() => configRef.current.request(variables), {
        retry: configRef.current.retry,
      });

      await tx.commit();

      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }

      setIsSuccess(true);
      configRef.current.onSuccess?.(result as TResult, variables);

      return result as TResult;
    } catch (err) {
      if (isMountedRef.current) {
        setIsError(true);
        setError(err as Error);
        configRef.current.onError?.(err as Error, variables);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsPending(false);
      }
    }
  };

  const mutate = (variables: TVariables) => {
    executeTransaction(variables).catch(() => {});
  };

  const mutateAsync = (variables: TVariables): Promise<TResult> => {
    return executeTransaction(variables);
  };

  return { mutate, mutateAsync, isPending, isError, isSuccess, error };
}
