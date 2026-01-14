import { describe, it, expect } from 'vitest';
import { filterEvents, DEFAULT_FILTER } from '../../../src/panel/utils/filter';
import type { FilterState } from '../../../src/panel/utils/filter';
import type { DevToolsEvent } from '../../../src/bridge/types';
import { EventPriority } from '../../../src/bridge/types';

const createMockEvent = (
  category: DevToolsEvent['category'],
  type: string,
  priority = EventPriority.NORMAL,
  data: Record<string, unknown> = {},
): DevToolsEvent =>
  ({
    id: `test-${Date.now()}-${Math.random()}`,
    category,
    type,
    timestamp: Date.now(),
    priority,
    data,
  }) as DevToolsEvent;

describe('filterEvents', () => {
  const sampleEvents: DevToolsEvent[] = [
    createMockEvent('prepaint', 'capture', EventPriority.NORMAL, { route: '/home' }),
    createMockEvent('prepaint', 'hydration.error', EventPriority.HIGH, { error: 'Mismatch' }),
    createMockEvent('model', 'init', EventPriority.LOW, { modelName: 'user' }),
    createMockEvent('model', 'sync.error', EventPriority.HIGH, { error: 'Network error' }),
    createMockEvent('tx', 'start', EventPriority.NORMAL, { txId: 'tx-123' }),
    createMockEvent('tx', 'step.fail', EventPriority.HIGH, { error: 'Step failed' }),
    createMockEvent('tx', 'rollback.start', EventPriority.HIGH, { txId: 'tx-123' }),
    createMockEvent('tx', 'timeout', EventPriority.HIGH, { txId: 'tx-456' }),
    createMockEvent('system', 'ready', EventPriority.NORMAL, { version: '1.0.0' }),
    createMockEvent('system', 'error', EventPriority.HIGH, { error: 'Critical' }),
  ];

  describe('empty input', () => {
    it('should return empty array for empty input', () => {
      const result = filterEvents([], DEFAULT_FILTER);
      expect(result).toEqual([]);
    });
  });

  describe('category filter', () => {
    it('should pass all events when category is "all"', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, category: 'all' };
      const result = filterEvents(sampleEvents, filter);
      expect(result).toHaveLength(sampleEvents.length);
    });

    it('should filter by prepaint category', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, category: 'prepaint' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'prepaint')).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should filter by model category', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, category: 'model' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'model')).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should filter by tx category', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, category: 'tx' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'tx')).toBe(true);
      expect(result).toHaveLength(4);
    });

    it('should filter by system category', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, category: 'system' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'system')).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('priority filter', () => {
    it('should pass all events when priority is "all"', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, priority: 'all' };
      const result = filterEvents(sampleEvents, filter);
      expect(result).toHaveLength(sampleEvents.length);
    });

    it('should filter by low priority', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, priority: 'low' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.priority === EventPriority.LOW)).toBe(true);
      expect(result).toHaveLength(1); // model init
    });

    it('should filter by normal priority', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, priority: 'normal' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.priority === EventPriority.NORMAL)).toBe(true);
      expect(result).toHaveLength(3); // prepaint capture, tx start, system ready
    });

    it('should filter by high priority', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, priority: 'high' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.priority === EventPriority.HIGH)).toBe(true);
      expect(result).toHaveLength(6);
    });
  });

  describe('search filter', () => {
    it('should pass all events when search is empty', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, search: '' };
      const result = filterEvents(sampleEvents, filter);
      expect(result).toHaveLength(sampleEvents.length);
    });

    it('should match by category', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, search: 'prep' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'prepaint')).toBe(true);
    });

    it('should match by type', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, search: 'capture' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.type.includes('capture'))).toBe(true);
    });

    it('should match by data content', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, search: 'tx-123' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => JSON.stringify(e.data).includes('tx-123'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, search: 'PREPAINT' };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'prepaint')).toBe(true);
    });

    it('should return empty array when no match', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, search: 'nonexistent' };
      const result = filterEvents(sampleEvents, filter);
      expect(result).toHaveLength(0);
    });
  });

  describe('errorOnly filter', () => {
    it('should pass all events when errorOnly is false', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, errorOnly: false };
      const result = filterEvents(sampleEvents, filter);
      expect(result).toHaveLength(sampleEvents.length);
    });

    it('should filter only error events when errorOnly is true', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, errorOnly: true };
      const result = filterEvents(sampleEvents, filter);

      // Should include: hydration.error, sync.error, step.fail, rollback.start, timeout, system error
      expect(result).toHaveLength(6);
      result.forEach((event) => {
        const isError =
          event.type.includes('error') ||
          event.type.includes('fail') ||
          event.type === 'rollback.start' ||
          event.type === 'timeout';
        expect(isError).toBe(true);
      });
    });

    it('should include rollback.start as error event', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, errorOnly: true };
      const result = filterEvents(sampleEvents, filter);
      expect(result.some((e) => e.type === 'rollback.start')).toBe(true);
    });

    it('should include timeout as error event', () => {
      const filter: FilterState = { ...DEFAULT_FILTER, errorOnly: true };
      const result = filterEvents(sampleEvents, filter);
      expect(result.some((e) => e.type === 'timeout')).toBe(true);
    });
  });

  describe('combined filters', () => {
    it('should apply category and priority filters together', () => {
      const filter: FilterState = {
        ...DEFAULT_FILTER,
        category: 'tx',
        priority: 'high',
      };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'tx' && e.priority === EventPriority.HIGH)).toBe(
        true,
      );
    });

    it('should apply category and errorOnly filters together', () => {
      const filter: FilterState = {
        ...DEFAULT_FILTER,
        category: 'model',
        errorOnly: true,
      };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'model')).toBe(true);
      expect(result.every((e) => e.type.includes('error'))).toBe(true);
    });

    it('should apply search and category filters together', () => {
      const filter: FilterState = {
        ...DEFAULT_FILTER,
        category: 'tx',
        search: 'tx-123',
      };
      const result = filterEvents(sampleEvents, filter);
      expect(result.every((e) => e.category === 'tx')).toBe(true);
      expect(result.every((e) => JSON.stringify(e.data).includes('tx-123'))).toBe(true);
    });

    it('should apply all filters together', () => {
      const filter: FilterState = {
        category: 'tx',
        priority: 'high',
        search: 'tx',
        errorOnly: true,
      };
      const result = filterEvents(sampleEvents, filter);
      expect(
        result.every(
          (e) =>
            e.category === 'tx' &&
            e.priority === EventPriority.HIGH &&
            (e.type.includes('error') ||
              e.type.includes('fail') ||
              e.type === 'rollback.start' ||
              e.type === 'timeout'),
        ),
      ).toBe(true);
    });
  });
});

describe('DEFAULT_FILTER', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_FILTER).toEqual({
      category: 'all',
      priority: 'all',
      search: '',
      errorOnly: false,
    });
  });
});
