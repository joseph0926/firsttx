import type { DevToolsEvent } from '../../bridge/types';

interface EventListProps {
  events: DevToolsEvent[];
  selectedEvent: DevToolsEvent | null;
  onSelectEvent: (event: DevToolsEvent) => void;
}

export function EventList({ events, selectedEvent, onSelectEvent }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="event-list">
        <div className="empty-state">
          <p>No events captured yet</p>
          <p className="hint">Interact with your FirstTx app to see events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list">
      <table className="event-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Category</th>
            <th>Type</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              className={selectedEvent?.id === event.id ? 'selected' : ''}
              onClick={() => onSelectEvent(event)}
            >
              <td>{new Date(event.timestamp).toLocaleTimeString()}</td>
              <td>
                <span className={`category-badge ${event.category}`}>{event.category}</span>
              </td>
              <td>{event.type}</td>
              <td>
                <span className={`priority-badge priority-${event.priority}`}>
                  {['LOW', 'NORMAL', 'HIGH'][event.priority]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
