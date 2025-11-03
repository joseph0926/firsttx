import { use } from 'react';
import type { Model } from './model';
import type { SuspenseFetcher } from './types';

export function useSuspenseSyncedModel<T>(model: Model<T>, fetcher: SuspenseFetcher<T>): T {
  const data = use(model.getSyncPromise(fetcher));

  if (!data) {
    throw new Error(
      `[useSuspenseSyncedModel] Model "${model.name}" returned null after sync. ` +
        `This indicates the fetcher returned null/undefined.`,
    );
  }

  return data;
}
