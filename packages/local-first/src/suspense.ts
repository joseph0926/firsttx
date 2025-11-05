import { useSyncExternalStore, useRef, useCallback } from 'react';
import type { Model } from './model';
import type { SuspenseFetcher } from './types';

export function useSuspenseSyncedModel<T>(model: Model<T>, fetcher: SuspenseFetcher<T>): T {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const stableFetcher = useCallback((current: T | null) => fetcherRef.current(current), []);

  const snapshot = useSyncExternalStore(
    model.subscribe,
    () => model.getCombinedSnapshot(),
    () => model.getCombinedSnapshot(),
  );

  if (!snapshot.data && !snapshot.error) {
    // eslint-disable-next-line
    throw model.getSyncPromise(stableFetcher);
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
