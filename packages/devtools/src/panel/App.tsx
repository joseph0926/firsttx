import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { EventDetail } from './components/EventDetail';
import type { DevToolsEvent } from '../bridge/types';
import type { BackgroundToDevToolsMessage } from '../extension/types';
import { EventList } from './components/EventList';

export function App() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<DevToolsEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DevToolsEvent | null>(null);

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

  return (
    <div className="app">
      <Toolbar connected={connected} eventCount={events.length} onClear={handleClearEvents} />
      <div className="app-content">
        <EventList events={events} selectedEvent={selectedEvent} onSelectEvent={setSelectedEvent} />
        <EventDetail event={selectedEvent} />
      </div>
    </div>
  );
}
