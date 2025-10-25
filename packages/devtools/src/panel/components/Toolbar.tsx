interface ToolbarProps {
  connected: boolean;
  eventCount: number;
  onClear: () => void;
}

export function Toolbar({ connected, eventCount, onClear }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="filter-btn active">All</button>
        <button className="filter-btn">Prepaint</button>
        <button className="filter-btn">Model</button>
        <button className="filter-btn">Tx</button>
      </div>
      <div className="toolbar-center">
        <input type="search" placeholder="Search events..." className="search-input" />
      </div>
      <div className="toolbar-right">
        <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
        <span className="event-count">{eventCount} events</span>
        <button className="clear-btn" onClick={onClear} disabled={eventCount === 0}>
          Clear
        </button>
      </div>
    </div>
  );
}
