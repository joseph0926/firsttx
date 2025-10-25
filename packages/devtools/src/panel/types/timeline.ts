import type { DevToolsEvent } from '../../bridge/types';

export interface TimelineConfig {
  height: number;
  laneHeight: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  eventRadius: number;
  groupLineWidth: number;
}

export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  height: 200,
  laneHeight: 40,
  padding: {
    top: 20,
    right: 40,
    bottom: 30,
    left: 100,
  },
  eventRadius: 5,
  groupLineWidth: 2,
};

export interface TimelineGroup {
  id: string;
  category: 'tx' | 'model';
  events: DevToolsEvent[];
  startTime: number;
  endTime: number;
  status: 'pending' | 'success' | 'error';
}

export interface TimelineScale {
  startTime: number;
  endTime: number;
  duration: number;
  pixelPerMs: number;
}

export const LANE_ORDER: Record<string, number> = {
  prepaint: 0,
  model: 1,
  tx: 2,
  system: 3,
};

export const LANE_LABELS: Record<string, string> = {
  prepaint: 'Prepaint',
  model: 'Model',
  tx: 'Tx',
  system: 'System',
};
