import type { DevToolsEvent } from '../../bridge/types';
import { EventPriority } from '../../bridge/types';

export type CategoryFilter = 'all' | 'prepaint' | 'model' | 'tx' | 'system';
export type PriorityFilter = 'all' | 'low' | 'normal' | 'high';

export interface FilterState {
  category: CategoryFilter;
  priority: PriorityFilter;
  search: string;
  errorOnly: boolean;
}

export const DEFAULT_FILTER: FilterState = {
  category: 'all',
  priority: 'all',
  search: '',
  errorOnly: false,
};

export function filterEvents(events: DevToolsEvent[], filter: FilterState): DevToolsEvent[] {
  return events.filter((event) => {
    if (filter.category !== 'all' && event.category !== filter.category) {
      return false;
    }

    if (filter.priority !== 'all') {
      const priorityMap: Record<Exclude<PriorityFilter, 'all'>, EventPriority> = {
        low: EventPriority.LOW,
        normal: EventPriority.NORMAL,
        high: EventPriority.HIGH,
      };
      if (event.priority !== priorityMap[filter.priority]) {
        return false;
      }
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchCategory = event.category.toLowerCase().includes(searchLower);
      const matchType = event.type.toLowerCase().includes(searchLower);
      const matchData = JSON.stringify(event.data).toLowerCase().includes(searchLower);

      if (!matchCategory && !matchType && !matchData) {
        return false;
      }
    }

    if (filter.errorOnly) {
      const isError =
        event.type.includes('error') ||
        event.type.includes('fail') ||
        event.type === 'rollback.start' ||
        event.type === 'timeout';

      if (!isError) {
        return false;
      }
    }

    return true;
  });
}
