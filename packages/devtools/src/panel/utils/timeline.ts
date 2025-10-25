import type { DevToolsEvent } from '../../bridge/types';
import type { TimelineGroup } from '../types/timeline';

export function groupTxEvents(events: DevToolsEvent[]): TimelineGroup[] {
  const txMap = new Map<string, DevToolsEvent[]>();

  events.forEach((event) => {
    if (event.category !== 'tx') return;

    const txId = (event.data as { txId?: string }).txId;
    if (!txId) return;

    if (!txMap.has(txId)) {
      txMap.set(txId, []);
    }
    txMap.get(txId)!.push(event);
  });

  return Array.from(txMap.entries()).map(([txId, groupEvents]) => {
    const sortedEvents = groupEvents.sort((a, b) => a.timestamp - b.timestamp);
    const startTime = sortedEvents[0].timestamp;
    const endTime = sortedEvents[sortedEvents.length - 1].timestamp;

    const hasError = sortedEvents.some(
      (e) => e.type.includes('fail') || e.type.includes('error') || e.type === 'rollback.start',
    );
    const hasCommit = sortedEvents.some((e) => e.type === 'commit');
    const hasRollback = sortedEvents.some((e) => e.type === 'rollback.success');

    let status: TimelineGroup['status'] = 'pending';
    if (hasError) status = 'error';
    else if (hasCommit || hasRollback) status = 'success';

    return {
      id: txId,
      category: 'tx',
      events: sortedEvents,
      startTime,
      endTime,
      status,
    };
  });
}

export function groupModelEvents(events: DevToolsEvent[]): TimelineGroup[] {
  const modelMap = new Map<string, DevToolsEvent[]>();

  events.forEach((event) => {
    if (event.category !== 'model') return;

    const modelName = (event.data as { modelName?: string }).modelName;
    if (!modelName) return;

    if (!modelMap.has(modelName)) {
      modelMap.set(modelName, []);
    }
    modelMap.get(modelName)!.push(event);
  });

  return Array.from(modelMap.entries()).map(([modelName, groupEvents]) => {
    const sortedEvents = groupEvents.sort((a, b) => a.timestamp - b.timestamp);
    const startTime = sortedEvents[0].timestamp;
    const endTime = sortedEvents[sortedEvents.length - 1].timestamp;

    const hasError = sortedEvents.some((e) => e.type.includes('error'));
    const hasSuccess = sortedEvents.some((e) => e.type === 'sync.success');

    let status: TimelineGroup['status'] = 'pending';
    if (hasError) status = 'error';
    else if (hasSuccess) status = 'success';

    return {
      id: modelName,
      category: 'model',
      events: sortedEvents,
      startTime,
      endTime,
      status,
    };
  });
}

export function getAllGroups(events: DevToolsEvent[]): TimelineGroup[] {
  return [...groupTxEvents(events), ...groupModelEvents(events)];
}
