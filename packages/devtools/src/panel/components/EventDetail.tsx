import type { DevToolsEvent } from '../../bridge/types';

interface EventDetailProps {
  event: DevToolsEvent | null;
}

export function EventDetail({ event }: EventDetailProps) {
  if (!event) {
    return (
      <div className="event-detail">
        <div className="empty-state">
          <p>Select an event to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail">
      <div className="detail-header">
        <h3>Event Details</h3>
        <span className="event-id">{event.id}</span>
      </div>
      <div className="detail-section">
        <h4>Basic Info</h4>
        <dl>
          <dt>Category:</dt>
          <dd>{event.category}</dd>
          <dt>Type:</dt>
          <dd>{event.type}</dd>
          <dt>Timestamp:</dt>
          <dd>{new Date(event.timestamp).toLocaleString()}</dd>
          <dt>Priority:</dt>
          <dd>{['LOW', 'NORMAL', 'HIGH'][event.priority]}</dd>
        </dl>
      </div>
      <div className="detail-section">
        <h4>Data</h4>
        <pre className="json-view">{JSON.stringify(event.data, null, 2)}</pre>
      </div>
    </div>
  );
}
