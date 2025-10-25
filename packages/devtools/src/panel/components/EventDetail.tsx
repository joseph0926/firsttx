import { useState } from 'react';
import type { DevToolsEvent } from '../../bridge/types';

interface EventDetailProps {
  event: DevToolsEvent | null;
}

export function EventDetail({ event }: EventDetailProps) {
  const [jsonExpanded, setJsonExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!event) {
    return (
      <div className="event-detail">
        <div className="empty-state">
          <p>Select an event to view details</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error('Failed to copy:', err);
      },
    );
  };

  return (
    <div className="event-detail">
      <div className="detail-header">
        <h3>Event Details</h3>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
            title="Copy entire event"
          >
            {copied ? '✓' : '📋'}
          </button>
          <span className="event-id">{event.id}</span>
        </div>
      </div>

      <div className="detail-section">
        <h4>Basic Info</h4>
        <dl>
          <dt>Category:</dt>
          <dd>
            <span className={`category-badge ${event.category}`}>{event.category}</span>
          </dd>
          <dt>Type:</dt>
          <dd>{event.type}</dd>
          <dt>Timestamp:</dt>
          <dd>{new Date(event.timestamp).toLocaleString()}</dd>
          <dt>Priority:</dt>
          <dd>
            <span className={`priority-badge priority-${event.priority}`}>
              {['LOW', 'NORMAL', 'HIGH'][event.priority]}
            </span>
          </dd>
        </dl>
      </div>

      <div className="detail-section">
        <div className="section-header">
          <h4>Event Data</h4>
          <div className="section-actions">
            <button
              className="icon-btn small"
              onClick={() => setJsonExpanded(!jsonExpanded)}
              title={jsonExpanded ? 'Collapse' : 'Expand'}
            >
              {jsonExpanded ? '−' : '+'}
            </button>
            <button
              className="icon-btn small"
              onClick={() => copyToClipboard(JSON.stringify(event.data, null, 2))}
              title="Copy data"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>
        {jsonExpanded && <pre className="json-view">{JSON.stringify(event.data, null, 2)}</pre>}
      </div>
    </div>
  );
}
