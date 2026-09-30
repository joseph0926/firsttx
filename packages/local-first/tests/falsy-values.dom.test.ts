// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { Suspense, createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { defineModel } from '../src/model';
import { useSuspenseSyncedModel } from '../src/suspense';
import { Storage } from '../src/storage';

describe('falsy primitive values (DOM)', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('firsttx-local-first');
    Storage.setInstance(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useSuspenseSyncedModel', () => {
    it('should render cached 0 without suspending on a refetch', async () => {
      const TestModel = defineModel('suspense-zero', {
        schema: z.number(),
        ttl: 5000,
      });

      await TestModel.replace(0);

      const fetcher = vi.fn().mockResolvedValue(1);

      function Child() {
        const value = useSuspenseSyncedModel(TestModel, fetcher);
        return createElement('span', { 'data-testid': 'value' }, String(value));
      }

      render(
        createElement(
          Suspense,
          { fallback: createElement('span', null, 'loading') },
          createElement(Child),
        ),
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('value').textContent).toBe('0');
        },
        { timeout: 2000 },
      );

      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should render cached empty string without suspending on a refetch', async () => {
      const TestModel = defineModel('suspense-empty', {
        schema: z.string(),
        ttl: 5000,
      });

      await TestModel.replace('');

      const fetcher = vi.fn().mockResolvedValue('server');

      function Child() {
        const value = useSuspenseSyncedModel(TestModel, fetcher);
        return createElement('span', { 'data-testid': 'value' }, `[${value}]`);
      }

      render(
        createElement(
          Suspense,
          { fallback: createElement('span', null, 'loading') },
          createElement(Child),
        ),
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('value').textContent).toBe('[]');
        },
        { timeout: 2000 },
      );

      expect(fetcher).not.toHaveBeenCalled();
    });
  });
});
