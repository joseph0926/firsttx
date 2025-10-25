import { useState } from 'react';
import type { DevToolsEvent } from '../../bridge/types';
import { TimelineSVG } from './TimelineSVG';

interface TimelineProps {
  events: DevToolsEvent[];
  selectedEvent: DevToolsEvent | null;
  onEventClick: (event: DevToolsEvent) => void;
}

export function Timeline({ events, selectedEvent, onEventClick }: TimelineProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`timeline ${collapsed ? 'collapsed' : ''}`}>
      <div className="timeline-header">
        <h3>Timeline</h3>
        <button
          className="timeline-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>
      {!collapsed && (
        <TimelineSVG events={events} selectedEvent={selectedEvent} onEventClick={onEventClick} />
      )}
    </div>
  );
}
