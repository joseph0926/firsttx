import { useSyncExternalStore, useState, useEffect } from 'react';
import type { ModelHistory } from './types';
import type { Model } from './model';

export function useModel<T>(model: Model<T>) {
  const state = useSyncExternalStore(
    model.subscribe,
    model.getCachedSnapshot,
    model.getCachedSnapshot,
  );

  const error = useSyncExternalStore(model.subscribe, model.getCachedError, model.getCachedError);

  const [history, setHistory] = useState<ModelHistory>({
    updatedAt: 0,
    age: Infinity,
    isStale: true,
    isConflicted: false,
  });

  useEffect(() => {
    model
      .getHistory()
      .then(setHistory)
      .catch((error: unknown) => {
        console.error(`[FirstTx] Failed to load history for model "${model.name}":`, error);
      });
  }, [model]);

  const patch = async (mutator: (draft: T) => void) => {
    await model.patch(mutator);

    try {
      const newHistory = await model.getHistory();

      setHistory((prev) => {
        return newHistory.updatedAt > prev.updatedAt ? newHistory : prev;
      });
    } catch (error: unknown) {
      console.error(`[FirstTx] Failed to update history for model "${model.name}":`, error);
    }
  };

  return [state, patch, history, error] as const;
}
