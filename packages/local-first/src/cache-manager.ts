import type { CacheStatus, ModelHistory } from './types';
import { FirstTxError } from './errors';

export type CacheState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: FirstTxError };

export type CombinedSnapshot<T> = {
  data: T | null;
  status: CacheStatus;
  error: FirstTxError | null;
  history: ModelHistory;
};

const DEFAULT_HISTORY: ModelHistory = {
  updatedAt: 0,
  age: Infinity,
  isStale: true,
  isConflicted: false,
};

export class CacheManager<T> {
  private cacheState: CacheState<T> = { status: 'loading' };
  private cachedHistory: ModelHistory = { ...DEFAULT_HISTORY };
  private cachedSnapshot: CombinedSnapshot<T>;
  private subscribers = new Set<() => void>();

  constructor(private readonly ttl: number) {
    this.cachedSnapshot = {
      data: null,
      status: 'loading',
      error: null,
      history: this.cachedHistory,
    };
  }

  getCacheState(): CacheState<T> {
    return this.cacheState;
  }

  getCachedSnapshot(): T | null {
    return this.cacheState.status === 'success' ? this.cacheState.data : null;
  }

  getCachedError(): FirstTxError | null {
    return this.cacheState.status === 'error' ? this.cacheState.error : null;
  }

  getCachedHistory(): ModelHistory {
    return this.cachedHistory;
  }

  getCombinedSnapshot(): CombinedSnapshot<T> {
    return this.cachedSnapshot;
  }

  isLoading(): boolean {
    return this.cacheState.status === 'loading';
  }

  updateWithData(data: T, updatedAt: number): void {
    this.cacheState = { status: 'success', data };
    this.updateHistory(updatedAt);
    this.updateSnapshot();
    this.notifySubscribers();
  }

  updateWithError(error: FirstTxError): void {
    this.cacheState = { status: 'error', error };
    this.updateSnapshot();
    this.notifySubscribers();
  }

  setLoading(): void {
    this.cacheState = { status: 'loading' };
    this.updateSnapshot();
    this.notifySubscribers();
  }

  updateHistory(updatedAt: number): void {
    const age = Date.now() - updatedAt;
    this.cachedHistory = {
      updatedAt,
      age,
      isStale: age >= this.ttl,
      isConflicted: false,
    };
  }

  setHistory(history: ModelHistory): void {
    this.cachedHistory = history;
    this.updateSnapshot();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  notifySubscribers(): void {
    this.subscribers.forEach((fn) => fn());
  }

  private updateSnapshot(): void {
    const newData = this.cacheState.status === 'success' ? this.cacheState.data : null;
    const newError = this.cacheState.status === 'error' ? this.cacheState.error : null;
    const newStatus = this.cacheState.status;

    if (
      this.cachedSnapshot.data === newData &&
      this.cachedSnapshot.status === newStatus &&
      this.cachedSnapshot.error === newError &&
      this.cachedSnapshot.history === this.cachedHistory
    ) {
      return;
    }

    this.cachedSnapshot = {
      data: newData,
      status: newStatus,
      error: newError,
      history: this.cachedHistory,
    };
  }
}
