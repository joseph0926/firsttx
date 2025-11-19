import { useSyncExternalStore } from 'react';

export type HandoffStrategy = 'has-prepaint' | 'cold-start';

let currentStrategy: HandoffStrategy | null = null;
const subscribers = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function getSnapshot(): HandoffStrategy | null {
  return currentStrategy;
}

export function setHandoffStrategy(strategy: HandoffStrategy): void {
  currentStrategy = strategy;
  subscribers.forEach((listener) => listener());
}

export function useHandoffStrategy(): HandoffStrategy | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
