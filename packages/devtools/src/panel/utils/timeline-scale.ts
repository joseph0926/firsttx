import type { DevToolsEvent } from '../../bridge/types';
import type { TimelineConfig, TimelineScale } from '../types/timeline';

export function calculateTimelineScale(
  events: DevToolsEvent[],
  config: TimelineConfig,
): TimelineScale {
  if (events.length === 0) {
    return {
      startTime: 0,
      endTime: 1000,
      duration: 1000,
      pixelPerMs: 1,
    };
  }

  const timestamps = events.map((e) => e.timestamp);
  const startTime = Math.min(...timestamps);
  const endTime = Math.max(...timestamps);
  const duration = Math.max(endTime - startTime, 1);

  const availableWidth = config.padding.left + config.padding.right;
  const chartWidth = Math.max(800, availableWidth);
  const pixelPerMs = (chartWidth - config.padding.left - config.padding.right) / duration;

  return {
    startTime,
    endTime,
    duration,
    pixelPerMs,
  };
}

export function timeToX(timestamp: number, scale: TimelineScale, config: TimelineConfig): number {
  return config.padding.left + (timestamp - scale.startTime) * scale.pixelPerMs;
}

export function categoryToY(category: string, config: TimelineConfig): number {
  const laneOrder: Record<string, number> = {
    prepaint: 0,
    model: 1,
    tx: 2,
    system: 3,
  };

  const laneIndex = laneOrder[category] ?? 0;
  return config.padding.top + laneIndex * config.laneHeight + config.laneHeight / 2;
}

export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

export function generateTimeMarkers(scale: TimelineScale): number[] {
  const { duration } = scale;
  const targetMarkerCount = 10;

  let interval = duration / targetMarkerCount;

  const niceIntervals = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  interval = niceIntervals.find((i) => i >= interval) ?? niceIntervals[niceIntervals.length - 1];

  const markers: number[] = [];
  let current = Math.ceil(scale.startTime / interval) * interval;

  while (current <= scale.endTime) {
    markers.push(current);
    current += interval;
  }

  return markers;
}
