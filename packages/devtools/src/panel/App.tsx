import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { EventDetail } from './components/EventDetail';
import { ResizablePanel } from './components/ResizablePanel';
import { Timeline } from './components/Timeline';
import type { DevToolsEvent } from '../bridge/types';
import type { BackgroundToDevToolsMessage } from '../extension/types';
import { EventList } from './components/EventList';
import { type FilterState, DEFAULT_FILTER, filterEvents } from './utils/filter';

type LayoutMode = 'default' | 'timeline';

export function App() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<DevToolsEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DevToolsEvent | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [layout, setLayout] = useState<LayoutMode>('default');

  useEffect(() => {
    console.log('[FirstTx Panel] Connecting to background...');

    const port = chrome.runtime.connect({ name: 'devtools-panel' });

    const tabId = chrome.devtools.inspectedWindow.tabId;
    port.postMessage({
      type: 'init',
      tabId,
    });

    port.onMessage.addListener((message: BackgroundToDevToolsMessage) => {
      console.log('[FirstTx Panel] Message received:', message);

      switch (message.type) {
        case 'connection-status':
          setConnected(message.connected ?? false);
          break;

        case 'events':
          if (message.events) {
            setEvents((prev) => [...prev, ...message.events!]);
          }
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      console.warn('[FirstTx Panel] Disconnected from background');
      setConnected(false);
    });

    return () => {
      console.log('[FirstTx Panel] Disconnecting...');
      port.disconnect();
    };
  }, []);

  const handleClearEvents = () => {
    setEvents([]);
    setSelectedEvent(null);
  };

  const filteredEvents = filterEvents(events, filter);

  return (
    <div className={`app layout-${layout}`}>
      <Toolbar
        connected={connected}
        eventCount={events.length}
        filteredCount={filteredEvents.length}
        filter={filter}
        onFilterChange={setFilter}
        onClear={handleClearEvents}
        layout={layout}
        onLayoutChange={setLayout}
      />
      {layout === 'timeline' && (
        <Timeline
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onEventClick={setSelectedEvent}
        />
      )}
      <div className={layout === 'timeline' ? 'content-row' : 'app-content'}>
        <EventList
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
        />
        <ResizablePanel>
          <EventDetail event={selectedEvent} />
        </ResizablePanel>
      </div>
    </div>
  );
}
