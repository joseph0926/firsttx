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

    expect(onSuccess).toHaveBeenCalledWith(serverResponse, { name: 'test' });
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
    expect((errorArg as RetryExhaustedError).lastError.message).toBe('Request failed');

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

    expect(optimistic).toHaveBeenCalledWith(variables);
    expect(request).toHaveBeenCalledWith(variables);
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

    process.removeListener('unhandledRejection', unhandledRejection);
  });
});
