import type { DevToolsEvent } from '../../bridge/types';

export interface PanelState {
  connected: boolean;
  events: DevToolsEvent[];
  selectedEvent: DevToolsEvent | null;
  filter: EventFilter;
}

export interface EventFilter {
  category: 'all' | 'prepaint' | 'model' | 'tx' | 'system';
  search: string;
  priority: 'all' | 'high' | 'normal' | 'low';
}
