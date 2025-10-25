import { useMemo } from 'react';
import type { DevToolsEvent } from '../../bridge/types';
import { EventPriority } from '../../bridge/types';
import {
  calculateTimelineScale,
  timeToX,
  categoryToY,
  formatDuration,
  generateTimeMarkers,
} from '../utils/timeline-scale';
import {
  type TimelineConfig,
  DEFAULT_TIMELINE_CONFIG,
  LANE_ORDER,
  LANE_LABELS,
} from '../types/timeline';
import { getAllGroups } from '../utils/timeline';

interface TimelineSVGProps {
  events: DevToolsEvent[];
  selectedEvent: DevToolsEvent | null;
  onEventClick: (event: DevToolsEvent) => void;
  config?: Partial<TimelineConfig>;
}

export function TimelineSVG({
  events,
  selectedEvent,
  onEventClick,
  config: configOverride,
}: TimelineSVGProps) {
  const config = { ...DEFAULT_TIMELINE_CONFIG, ...configOverride };
  const scale = useMemo(() => calculateTimelineScale(events, config), [events, config]);
  const groups = useMemo(() => getAllGroups(events), [events]);
  const timeMarkers = useMemo(() => generateTimeMarkers(scale), [scale]);

  const totalHeight = config.padding.top + 4 * config.laneHeight + config.padding.bottom;
  const totalWidth = config.padding.left + scale.duration * scale.pixelPerMs + config.padding.right;

  if (events.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No events to display</p>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <svg width="100%" height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {Object.entries(LANE_ORDER).map(([category, index]) => {
          const y = config.padding.top + index * config.laneHeight;
          return (
            <g key={category}>
              <rect
                x="0"
                y={y}
                width={totalWidth}
                height={config.laneHeight}
                fill={index % 2 === 0 ? '#fafafa' : '#ffffff'}
              />
              <line
                x1="0"
                y1={y + config.laneHeight}
                x2={totalWidth}
                y2={y + config.laneHeight}
                stroke="#e0e0e0"
                strokeWidth="1"
              />
              <text
                x={config.padding.left - 10}
                y={y + config.laneHeight / 2}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize="12"
                fill="#666"
              >
                {LANE_LABELS[category]}
              </text>
            </g>
          );
        })}

        {timeMarkers.map((timestamp) => {
          const x = timeToX(timestamp, scale, config);
          return (
            <g key={timestamp}>
              <line
                x1={x}
                y1={config.padding.top}
                x2={x}
                y2={totalHeight - config.padding.bottom}
                stroke="#e0e0e0"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={x}
                y={totalHeight - config.padding.bottom + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#999"
              >
                {formatDuration(timestamp - scale.startTime)}
              </text>
            </g>
          );
        })}

        {groups.map((group) => {
          const startX = timeToX(group.startTime, scale, config);
          const endX = timeToX(group.endTime, scale, config);
          const y = categoryToY(group.category, config);

          let strokeColor = '#999';
          if (group.status === 'success') strokeColor = '#4caf50';
          if (group.status === 'error') strokeColor = '#f44336';

          return (
            <line
              key={group.id}
              x1={startX}
              y1={y}
              x2={endX}
              y2={y}
              stroke={strokeColor}
              strokeWidth={config.groupLineWidth}
              opacity={0.3}
            />
          );
        })}

        {events.map((event) => {
          const x = timeToX(event.timestamp, scale, config);
          const y = categoryToY(event.category, config);

          let fill = '#2196f3';
          if (event.priority === EventPriority.HIGH) fill = '#f44336';
          else if (event.priority === EventPriority.NORMAL) fill = '#ff9800';

          const isSelected = selectedEvent?.id === event.id;

          return (
            <circle
              key={event.id}
              cx={x}
              cy={y}
              r={isSelected ? config.eventRadius * 1.5 : config.eventRadius}
              fill={fill}
              stroke={isSelected ? '#000' : 'none'}
              strokeWidth={isSelected ? 2 : 0}
              style={{ cursor: 'pointer' }}
              filter={isSelected ? 'url(#shadow)' : undefined}
              onClick={() => onEventClick(event)}
            >
              <title>
                {event.category} - {event.type} ({formatDuration(event.timestamp - scale.startTime)}
                )
              </title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
