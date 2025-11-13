import { useSyncExternalStore, useRef, useCallback } from 'react';
import type { Model } from './model';
import type { SuspenseFetcher, SuspenseSyncOptions } from './types';

export function useSuspenseSyncedModel<T>(
  model: Model<T>,
  fetcher: SuspenseFetcher<T>,
  options?: SuspenseSyncOptions<T>,
): T {
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef<SuspenseSyncOptions<T> | undefined>(options);

  fetcherRef.current = fetcher;
  optionsRef.current = options;

  const stableFetcher = useCallback((current: T | null) => fetcherRef.current(current), []);

  const snapshot = useSyncExternalStore(
    model.subscribe,
    () => model.getCombinedSnapshot(),
    () => model.getCombinedSnapshot(),
  );

  if (!snapshot.data && !snapshot.error) {
    const currentOptions = optionsRef.current;
    // eslint-disable-next-line
    throw model.getSyncPromise(stableFetcher, {
      revalidateOnMount: currentOptions?.revalidateOnMount,
      onSuccess: currentOptions?.onSuccess,
      onError: currentOptions?.onError,
    });
  }

  if (snapshot.error) {
    throw snapshot.error;
  }

  if (!snapshot.data) {
    throw new Error(
      `[useSuspenseSyncedModel] Model "${model.name}" returned null after sync. ` +
        `This indicates the fetcher returned null/undefined.`,
    );
  }

  return snapshot.data;
}
