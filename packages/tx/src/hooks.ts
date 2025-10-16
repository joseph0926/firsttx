import { useEffect, useRef, useState } from 'react';
import { startTransaction } from '.';

export type UseTxConfig<TVariables> = {
  optimistic: (variables: TVariables) => Promise<void>;
  rollback: (variables: TVariables) => Promise<void>;
  request: (variables: TVariables) => Promise<unknown>;
  transition?: boolean;
  retry?: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: 'linear' | 'exponential';
  };
  onSuccess?: (result: unknown, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
};

export type UseTxResult<TVariables> = {
  mutate: (variables: TVariables) => void;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
};

export function useTx<TVariables>(config: UseTxConfig<TVariables>): UseTxResult<TVariables> {
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const configRef = useRef<UseTxConfig<TVariables>>(config);
  configRef.current = config;

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = (variables: TVariables) => {
    const execute = async () => {
      if (!isMountedRef.current) return;

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

        if (!isMountedRef.current) return;
        setIsSuccess(true);
        configRef.current.onSuccess?.(result, variables);
      } catch (err) {
        if (!isMountedRef.current) return;
        setIsError(true);
        setError(err as Error);
        configRef.current.onError?.(err as Error, variables);
      } finally {
        if (isMountedRef.current) {
          setIsPending(false);
        }
      }
    };

    execute().catch(() => {});
  };

  return { mutate, isPending, isError, isSuccess, error };
}
