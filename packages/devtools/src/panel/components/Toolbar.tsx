import type { FilterState, CategoryFilter, PriorityFilter } from '../utils/filter';

type LayoutMode = 'default' | 'timeline';

interface ToolbarProps {
  connected: boolean;
  eventCount: number;
  filteredCount: number;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onClear: () => void;
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
}

export function Toolbar({
  connected,
  eventCount,
  filteredCount,
  filter,
  onFilterChange,
  onClear,
  layout,
  onLayoutChange,
}: ToolbarProps) {
  const categories: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'prepaint', label: 'Prepaint' },
    { value: 'model', label: 'Model' },
    { value: 'tx', label: 'Tx' },
    { value: 'system', label: 'System' },
  ];

  const priorities: { value: PriorityFilter; label: string }[] = [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {categories.map(({ value, label }) => (
          <button
            key={value}
            className={`filter-btn ${filter.category === value ? 'active' : ''}`}
            onClick={() => onFilterChange({ ...filter, category: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="toolbar-center">
        <input
          type="search"
          placeholder="Search events..."
          className="search-input"
          value={filter.search}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
        />
      </div>

      <div className="toolbar-right">
        <button
          className={`layout-btn ${layout === 'timeline' ? 'active' : ''}`}
          onClick={() => onLayoutChange(layout === 'default' ? 'timeline' : 'default')}
          title="Toggle Timeline"
        >
          📊 Timeline
        </button>

        <select
          className="priority-select"
          value={filter.priority}
          onChange={(e) =>
            onFilterChange({ ...filter, priority: e.target.value as PriorityFilter })
          }
        >
          {priorities.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          className={`toggle-btn ${filter.errorOnly ? 'active' : ''}`}
          onClick={() => onFilterChange({ ...filter, errorOnly: !filter.errorOnly })}
          title="Show errors only"
        >
          ⚠️ Errors
        </button>

        <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>

        <span className="event-count">
          {filteredCount} / {eventCount} events
        </span>

        <button className="clear-btn" onClick={onClear} disabled={eventCount === 0}>
          Clear
        </button>
      </div>
    </div>
  );
}
