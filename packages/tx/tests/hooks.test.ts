import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RetryExhaustedError, useTx } from '../src';

describe('useTx', () => {
  beforeEach(() => {
    if (!('startViewTransition' in document)) {
      // eslint-disable-next-line
      (document as any).startViewTransition = vi.fn((callback) => {
        // eslint-disable-next-line
        callback();
        return { finished: Promise.resolve() };
      });
    }
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        request: async () => {},
      }),
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should set isPending during execution', async () => {
    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        request: async () => new Promise((resolve) => setTimeout(resolve, 100)),
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should execute optimistic and request in order', async () => {
    const order: string[] = [];
    // eslint-disable-next-line
    const optimistic = vi.fn(async () => {
      order.push('optimistic');
    });
    // eslint-disable-next-line
    const request = vi.fn(async () => {
      order.push('request');
    });

    const { result } = renderHook(() =>
      useTx({
        optimistic,
        rollback: async () => {},
        request,
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(order).toEqual(['optimistic', 'request']);
    expect(optimistic).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should call onSuccess when transaction succeeds', async () => {
    const onSuccess = vi.fn();
    const serverResponse = { id: '123' };

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => serverResponse,
        onSuccess,
      }),
    );

    act(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(serverResponse, { name: 'test' }, undefined);
  });

  it('should rollback and call onError when request fails', async () => {
    const rollback = vi.fn(async () => {});
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback,
        // eslint-disable-next-line
        request: async () => {
          throw new Error('Request failed');
        },
        onError,
      }),
    );

    act(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(rollback).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);

    // eslint-disable-next-line
    const errorArg = onError.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(RetryExhaustedError);

    const retryError = errorArg as RetryExhaustedError;
    expect(retryError.errors[retryError.attempts - 1].message).toBe('Request failed');

    expect(result.current.error).toBeInstanceOf(RetryExhaustedError);
  });

  it('should reset error state on new mutate call', async () => {
    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => {
          throw new Error('First error');
        },
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const { result: result2 } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => 'success',
      }),
    );

    act(() => {
      result2.current.mutate({});
    });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(result2.current.isError).toBe(false);
    expect(result2.current.error).toBe(null);
  });

  it('should pass variables to all functions', async () => {
    const variables = { id: '1', name: 'item' };
    const optimistic = vi.fn(async () => {});
    const request = vi.fn(async () => {});

    const { result } = renderHook(() =>
      useTx({
        optimistic,
        rollback: async () => {},
        request,
      }),
    );

    act(() => {
      result.current.mutate(variables);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(optimistic).toHaveBeenCalledWith(variables, expect.any(AbortSignal));
    expect(request).toHaveBeenCalledWith(variables, expect.any(AbortSignal));
  });

  it('should handle retry configuration', async () => {
    let attempt = 0;
    const optimistic = vi.fn(async () => {});
    // eslint-disable-next-line
    const request = vi.fn(async () => {
      attempt++;
      if (attempt < 2) {
        throw new Error('Retry me');
      }
      return 'success';
    });

    const { result } = renderHook(() =>
      useTx({
        optimistic,
        rollback: async () => {},
        request,
        retry: { maxAttempts: 2, delayMs: 10 },
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 3000 },
    );

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('should use ViewTransition when transition is true', async () => {
    const spy = vi.spyOn(document, 'startViewTransition');

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => {
          throw new Error('Request failed');
        },
        transition: true,
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(spy).toHaveBeenCalled();
  });

  it('should not update state after unmount', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result, unmount } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        request: async () => new Promise((resolve) => setTimeout(resolve, 100)),
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("Can't perform a React state update on an unmounted component"),
    );

    consoleError.mockRestore();
  });

  it('should use latest config via ref', async () => {
    const onSuccess1 = vi.fn();
    const onSuccess2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ onSuccess }) =>
        useTx({
          optimistic: async () => {},
          rollback: async () => {},
          request: async () => {},
          onSuccess,
        }),
      { initialProps: { onSuccess: onSuccess1 } },
    );

    rerender({ onSuccess: onSuccess2 });

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess1).not.toHaveBeenCalled();
    expect(onSuccess2).toHaveBeenCalled();
  });

  it('should handle concurrent mutate calls independently', async () => {
    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        request: async () => new Promise((resolve) => setTimeout(resolve, 50)),
      }),
    );

    act(() => {
      result.current.mutate({ id: 1 });
      result.current.mutate({ id: 2 });
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should prevent unhandled promise rejection', async () => {
    const unhandledRejection = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    process.on('unhandledRejection', unhandledRejection);

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => {
          throw new Error('Test error');
        },
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(unhandledRejection).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    process.removeListener('unhandledRejection', unhandledRejection);
  });

  it('should return result from mutateAsync when transaction succeeds', async () => {
    const serverResponse = { id: '123', name: 'Item' };

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => serverResponse,
      }),
    );

    let actualResult;
    await act(async () => {
      actualResult = await result.current.mutateAsync({});
    });

    expect(actualResult).toEqual(serverResponse);
    expect(result.current.isSuccess).toBe(true);
  });

  it('should reject mutateAsync promise when transaction fails', async () => {
    const testError = new Error('Request failed');

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => {
          throw testError;
        },
      }),
    );

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow();
    });

    expect(result.current.isError).toBe(true);
  });

  it('should handle concurrent mutateAsync calls', async () => {
    let counter = 0;

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        request: async () => {
          counter++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return counter;
        },
      }),
    );

    let results: number[] = [];
    await act(async () => {
      results = await Promise.all([
        result.current.mutateAsync({}),
        result.current.mutateAsync({}),
        result.current.mutateAsync({}),
      ]);
    });

    expect(results).toEqual([3, 3, 3]);
    expect(result.current.isSuccess).toBe(true);
  });

  it('mutate should not return promise while mutateAsync should', async () => {
    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => ({ id: '123' }),
      }),
    );

    const mutateResult = result.current.mutate({});
    expect(mutateResult).toBeUndefined();

    let mutateAsyncResult;
    // eslint-disable-next-line
    await act(async () => {
      mutateAsyncResult = result.current.mutateAsync({});
    });
    expect(mutateAsyncResult).toBeInstanceOf(Promise);
  });

  it('should call onSuccess with correct result type for mutateAsync', async () => {
    const onSuccess = vi.fn();
    const serverResponse = { id: '456', data: 'test' };

    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => serverResponse,
        onSuccess,
      }),
    );

    await act(async () => {
      await result.current.mutateAsync({ input: 'test' });
    });

    expect(onSuccess).toHaveBeenCalledWith(serverResponse, { input: 'test' }, undefined);
  });

  it('should process different data in concurrent calls', async () => {
    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        request: async (id: number) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { id, processed: true };
        },
      }),
    );

    let results;
    await act(async () => {
      results = await Promise.all([
        result.current.mutateAsync(1),
        result.current.mutateAsync(2),
        result.current.mutateAsync(3),
      ]);
    });

    expect(results).toEqual([
      { id: 1, processed: true },
      { id: 2, processed: true },
      { id: 3, processed: true },
    ]);
  });

  it('should pass snapshot from optimistic to rollback', async () => {
    const tempId = 'temp-123';
    let rollbackReceivedSnapshot: string | undefined;

    const { result } = renderHook(() =>
      useTx({
        // eslint-disable-next-line
        optimistic: async () => tempId,
        // eslint-disable-next-line
        rollback: async (_, snapshot) => {
          rollbackReceivedSnapshot = snapshot;
        },
        // eslint-disable-next-line
        request: async () => {
          throw new Error('Request failed');
        },
      }),
    );

    await act(async () => {
      await result.current.mutateAsync({}).catch(() => {});
    });

    expect(rollbackReceivedSnapshot).toBe(tempId);
  });

  it('should pass snapshot from optimistic to onSuccess', async () => {
    const tempId = 'temp-456';
    let successReceivedSnapshot: string | undefined;

    const { result } = renderHook(() =>
      useTx({
        // eslint-disable-next-line
        optimistic: async () => tempId,
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => ({ id: 'real-123' }),
        onSuccess: (_, __, snapshot) => {
          successReceivedSnapshot = snapshot;
        },
      }),
    );

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(successReceivedSnapshot).toBe(tempId);
  });

  it('should handle complex snapshot data', async () => {
    interface SnapshotData {
      tempId: string;
      previousData: { name: string };
      timestamp: number;
    }

    let rollbackSnapshot: SnapshotData | undefined;
    let successSnapshot: SnapshotData | undefined;

    const snapshotData: SnapshotData = {
      tempId: 'temp-789',
      previousData: { name: 'Alice' },
      timestamp: Date.now(),
    };

    const { result } = renderHook(() =>
      useTx({
        // eslint-disable-next-line
        optimistic: async () => snapshotData,
        // eslint-disable-next-line
        rollback: async (_, snapshot) => {
          rollbackSnapshot = snapshot;
        },
        // eslint-disable-next-line
        request: async () => ({ id: 'real-456', name: 'Bob' }),
        onSuccess: (_, __, snapshot) => {
          successSnapshot = snapshot;
        },
      }),
    );

    await act(async () => {
      await result.current.mutateAsync({ action: 'update' });
    });

    expect(successSnapshot).toEqual(snapshotData);
    expect(rollbackSnapshot).toBeUndefined();
  });

  it('should work with void snapshot (backward compatibility)', async () => {
    const optimistic = vi.fn(async () => {});
    const rollback = vi.fn(async () => {});

    const { result } = renderHook(() =>
      useTx({
        optimistic,
        rollback,
        // eslint-disable-next-line
        request: async () => 'success',
      }),
    );

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(optimistic).toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
  });

  it('should cancel pending transaction', async () => {
    const optimistic = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    const rollback = vi.fn(async () => {});
    const request = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(() => resolve('success'), 2000));
      return 'success';
    });

    const { result } = renderHook(() =>
      useTx({
        optimistic,
        rollback,
        request,
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    act(() => {
      result.current.cancel();
    });

    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
      },
      { timeout: 3000 },
    );

    expect(optimistic).toHaveBeenCalled();
  });

  it('should cancel on unmount when cancelOnUnmount is true', async () => {
    let cancelled = false;
    const optimistic = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const rollback = vi.fn(async () => {});
    const request = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(() => resolve('success'), 1000));
      if (cancelled) {
        throw new Error('Should not reach here after cancel');
      }
      return 'success';
    });

    const { result, unmount } = renderHook(() =>
      useTx({
        optimistic,
        rollback,
        request,
        cancelOnUnmount: true,
      }),
    );

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    cancelled = true;
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(optimistic).toHaveBeenCalled();
  });

  it('should not cancel on unmount when cancelOnUnmount is false', async () => {
    const optimistic = vi.fn(async () => {});
    const rollback = vi.fn(async () => {});
    // eslint-disable-next-line
    const request = vi.fn(async () => 'success');
    const onSuccess = vi.fn();

    const { result, unmount } = renderHook(() =>
      useTx({
        optimistic,
        rollback,
        request,
        onSuccess,
        cancelOnUnmount: false,
      }),
    );

    await act(async () => {
      await result.current.mutateAsync({});
    });

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onSuccess).toHaveBeenCalled();
  });

  // eslint-disable-next-line
  it('should handle cancel before transaction starts', async () => {
    const { result } = renderHook(() =>
      useTx({
        optimistic: async () => {},
        rollback: async () => {},
        // eslint-disable-next-line
        request: async () => 'success',
      }),
    );

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isPending).toBe(false);
  });
});
