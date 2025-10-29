# @firsttx/devtools

> **Debug FirstTx apps with visibility into Prepaint, Model sync, and Tx execution**

## Why DevTools?

**Without DevTools, debugging FirstTx feels like flying blind**

- ❌ "Why didn't prepaint restore?" → No visibility into snapshot lifecycle
- ❌ "Which model triggered sync?" → Can't trace sync cascades
- ❌ "Did my transaction rollback?" → No compensation tracking
- ❌ "Is this error from Model or Tx?" → Event soup in console

**With DevTools, you see everything**

- ✅ Timeline view showing exact timing of Prepaint → Model → Tx
- ✅ Transaction grouping with rollback visualization
- ✅ Model sync triggers (mount/manual/stale) with duration
- ✅ Advanced filtering by category, priority, errors

---

## Installation

### 0. Chrome Web Store

[Chrome Web Store - Firsttx Devtools](https://chromewebstore.google.com/detail/firsttx-devtools/onpdifkipmmkajdhodmpphmlpbnopkdd)

### 1. Install Latest FirstTx Packages

DevTools requires packages with event emission:

```bash
pnpm add @firsttx/prepaint@^0.3.3 @firsttx/local-first@^0.4.1 @firsttx/tx@^0.2.2
```

> ⚠️ **Important**: DevTools won't work with older versions that don't emit events.

### 2. Build the Extension

```bash
# Clone the repo (if you haven't)
git clone https://github.com/joseph0926/firsttx.git
cd firsttx

# Install dependencies
pnpm install

# Build devtools
cd packages/devtools
pnpm build
```

This creates `dist/` folder with the Chrome extension.

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select `packages/devtools/dist` folder

You should see "FirstTx DevTools" in your extensions list.

---

## Quick Start

### Open DevTools Panel

1. Start your FirstTx app: `pnpm dev`
2. Open browser DevTools: `F12` or `Cmd+Option+I`
3. Find **"FirstTx"** tab (next to Console, Network, etc.)

If you don't see it, check:

- Extension is enabled in `chrome://extensions`
- Your app uses FirstTx packages with correct versions
- Page has loaded (refresh if needed)

### Trigger Some Events

Interact with your app to generate events:

```tsx
// This generates events you'll see in DevTools:

// 1. Prepaint events
// - Open page → 'restore' event
// - Navigate away → 'capture' event

// 2. Model events
// - Component mounts → 'init', 'load' events
// - Sync triggers → 'sync.start', 'sync.success'
// - Manual sync → 'sync.start'

// 3. Tx events
// - Start transaction → 'start' event
// - Each step → 'step.start', 'step.success'
// - Commit/rollback → 'commit' or 'rollback.start'
```

---

## Core Features

### 1. Event List (Left Panel)

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1761388489/firsttx-devtools-01_ru58a6.png" alt="Event List" width="600" />

**Shows all events in chronological order**

- **Category badges**: Color-coded (Prepaint=blue, Model=purple, Tx=orange)
- **Priority indicators**: LOW/NORMAL/HIGH
- **Click to inspect**: Opens detailed view in right panel

**Filter events**

- By category: All / Prepaint / Model / Tx / System
- By priority: All / Low / Normal / High
- Search: Type keywords to filter by category, type, or data
- Errors only: Toggle to show only failures

### 2. Timeline View (Top Panel)

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1761388489/firsttx-devtools-01_ru58a6.png" alt="Timeline" width="800" />

**Visual timeline with 4 lanes**

```
[Prepaint] ●────restore───●───handoff
[Model]    ──●─init──●─load──●─sync.start──●─sync.success
[Tx]       ────────────────────────●─start──●─step──●─commit
[System]   ●─ready
```

**Features**

- Automatic time scaling (fits all events)
- Group connection lines (Tx and Model events linked by ID)
- Status coloring (green=success, red=error, gray=pending)
- Click event → syncs with Event List selection

**Toggle timeline**

- Click "📊 Timeline" button in toolbar
- Switches between 2-column and 3-row layout

### 3. Event Detail (Right Panel)

**Selected event details**

- Basic info: Category, Type, Timestamp, Priority
- Event data: JSON view with syntax highlighting
- Collapsible sections: Click "−" to collapse JSON
- Copy buttons: 📋 Copy entire event or data only

**Resizable**

- Drag left edge to resize (300px - 800px)
- Width saves to localStorage

---

## Real-World Debugging Scenarios

### Scenario 1: "Why didn't Prepaint restore?"

**Problem**: Page shows blank screen on revisit

**Debug steps**

1. Open DevTools → FirstTx tab
2. Filter by "Prepaint" category
3. Look for events:
   - ✅ `capture` event → Snapshot was saved
   - ❌ No `restore` event → Snapshot missing or expired
   - ⚠️ `hydration.error` → DOM mismatch

**Common causes**

- TTL expired (7 days default)
- `#root` had 0 or 2+ children (hydration skipped)
- IndexedDB quota exceeded

**Fix**

```tsx
// Check snapshot in browser console:
indexedDB.open('firsttx-prepaint', 1).onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('snapshots', 'readonly');
  tx.objectStore('snapshots').getAll().onsuccess = (e2) => {
    console.log('Snapshots:', e2.target.result);
  };
};
```

---

### Scenario 2: "Which model keeps re-syncing?"

**Problem**: Too many sync requests, slowing down app

**Debug steps**

1. Filter by "Model" category + "sync.start" type
2. Check `data.trigger` field:
   - `mount` → Component re-mounting
   - `stale` → TTL expired
   - `manual` → Explicit `sync()` call

3. Check Timeline:
   - Multiple sync lines for same modelName = problem
   - Look for pattern (every N seconds?)

**Common causes**

- TTL too short (`ttl: 1000` → syncs every second)
- Component unmounting/remounting in loop
- `useEffect` calling `sync()` without proper deps

**Fix**

```tsx
// Increase TTL
const Model = defineModel('cart', {
  ttl: 5 * 60 * 1000, // 5 minutes instead of 1 second
});

// Or use syncOnMount: 'never' for manual control
const { sync } = useSyncedModel(Model, fetcher, {
  syncOnMount: 'never',
});
```

---

### Scenario 3: "Transaction rolled back but UI is broken"

**Problem**: Optimistic update failed, UI doesn't match data

**Debug steps**

1. Filter by Tx category + your txId
2. Timeline should show:
   - `start` → `step.start` → `step.fail` → `rollback.start` → `rollback.success`

3. If `rollback.fail` appears:
   - Check `data.errors` field
   - Compensation function threw error

4. If no rollback events:
   - Transaction didn't reach `commit()` or error handler
   - Check for unhandled promise rejection

**Common causes**

- Compensate function has bug: `compensate: () => patch(draft => { throw new Error() })`
- Compensate uses stale closure: `compensate: () => patch(draft => { draft.items = oldItems })` but `oldItems` is undefined
- No compensate provided: `tx.run(optimistic)` without `{ compensate }`

**Fix**

```tsx
const tx = startTransaction();

// ✅ Correct: compensate captures current state
const oldItems = [...cart.items];
await tx.run(
  () =>
    CartModel.patch((draft) => {
      draft.items.push(newItem);
    }),
  {
    compensate: () =>
      CartModel.patch((draft) => {
        draft.items = oldItems; // Captured above
      }),
  },
);

// ❌ Wrong: compensate uses undefined variable
await tx.run(
  () =>
    CartModel.patch((draft) => {
      draft.items.push(newItem);
    }),
  {
    compensate: () =>
      CartModel.patch((draft) => {
        draft.items = previousItems; // Where does this come from?
      }),
  },
);
```

---

## Advanced Features

### Filtering

**Category filter**

```
All → Shows everything
Prepaint → capture, restore, handoff, hydration.error, storage.error
Model → init, load, patch, replace, sync.*, broadcast, validation.error
Tx → start, step.*, commit, rollback.*, timeout
System → ready, error
```

**Priority filter**

```
All → Everything
Low → step.start, step.success, broadcast, patch, load
Normal → init, replace, sync.*, commit, restore
High → *.error, *.fail, rollback.start, timeout
```

**Search**

- Searches in: category, type, JSON data
- Case-insensitive
- Example: Search "CartModel" → shows all events for that model

**Error toggle**

- Shows only events with:
  - Type includes "error" or "fail"
  - Type is "rollback.start" or "timeout"
- Quick way to find problems

### Grouping

**Tx groups**

- Events with same `txId` are linked
- Connection line shows:
  - Green → Transaction committed successfully
  - Red → Transaction rolled back or failed
  - Gray → Transaction still pending

**Model groups**

- Events with same `modelName` are linked
- Connection line shows:
  - Green → Sync succeeded
  - Red → Validation or sync error
  - Gray → Sync in progress

### Layout Modes

**Default (2-column)**

```
┌──────────────┬───────────────┐
│  Event List  │ Event Detail  │
│              │  (resizable)  │
└──────────────┴───────────────┘
```

**Timeline (3-row)**

```
┌────────────────────────────────┐
│  Timeline (collapsible)        │
├──────────────┬─────────────────┤
│  Event List  │  Event Detail   │
└──────────────┴─────────────────┘
```

Toggle via "📊 Timeline" button in toolbar.

---

## Performance Considerations

### Event Buffer

DevTools keeps last **500 events** in memory (configurable in bridge):

```ts
// packages/devtools/src/bridge/core.ts
const DEFAULT_CONFIG = {
  maxBufferSize: 500,
  // ...
};
```

If you generate >500 events, oldest events are dropped.

**When this matters**

- Long debugging sessions
- High-frequency events (e.g., patch on every keystroke)

**Solution**

- Click "Clear" button periodically
- Reduce event noise (e.g., debounce patch calls)

### High-Priority Events

HIGH priority events (errors, rollbacks) are:

1. Sent immediately (no batching)
2. Saved to IndexedDB (optional)

This ensures you never lose critical errors, even if DevTools panel is closed.

### Batch Intervals

Normal/Low events are batched to reduce overhead:

```ts
const DEFAULT_CONFIG = {
  normalBatchInterval: 100, // 100ms
  lowBatchInterval: 500, // 500ms
};
```

**Trade-off**

- Shorter interval → More real-time, more overhead
- Longer interval → Less overhead, slight delay

---

## Troubleshooting

### "FirstTx tab doesn't appear in DevTools"

**Check**

1. Extension enabled: `chrome://extensions` → FirstTx DevTools = ON
2. Correct package versions:
   ```bash
   npm list @firsttx/prepaint @firsttx/local-first @firsttx/tx
   # Should show 0.3.3, 0.4.1, 0.2.2 or higher
   ```
3. Page loaded: Refresh page after enabling extension
4. Console errors: Check for `[FirstTx]` messages in browser console

### "No events showing"

**Check**

1. App is actually using FirstTx features:
   - For Prepaint: Visit page, leave, return
   - For Model: Use `useModel` or `useSyncedModel` hook
   - For Tx: Call `startTransaction()`

2. Extension connected:
   - Green dot "Connected" in toolbar?
   - If red "Disconnected", reload page

3. Events filtered out:
   - Try "All" category + "All Priority"
   - Clear search box
   - Turn off "Errors only" toggle

### "Timeline is empty but Event List has events"

**Possible causes**

1. Timeline is collapsed: Click ▼ button to expand
2. No events with timestamps: Timeline requires `event.timestamp`
3. All events at same timestamp: Timeline shows single vertical line

### "Extension crashes on event flood"

**Symptom**: Tab freezes when generating many events quickly

**Cause**: Event buffer overflow or DOM update thrashing

**Fix**

```tsx
// Debounce high-frequency updates
import { debounce } from 'lodash';

const debouncedPatch = debounce((value) => {
  Model.patch((draft) => {
    draft.text = value;
  });
}, 300);

<input onChange={(e) => debouncedPatch(e.target.value)} />;
```

Or reduce event generation:

```tsx
// ❌ Emits event on every keystroke
<input onChange={(e) => Model.patch(draft => { draft.text = e.target.value })} />

// ✅ Only emits on blur
<input onBlur={(e) => Model.patch(draft => { draft.text = e.target.value })} />
```

---

## API Reference

### Window API (Injected by Bridge)

```ts
window.__FIRSTTX_DEVTOOLS__ = {
  emit: (event: DevToolsEvent) => void;
  isConnected: () => boolean;
};
```

**Usage** (Internal - packages use this automatically):

```ts
if (window.__FIRSTTX_DEVTOOLS__) {
  window.__FIRSTTX_DEVTOOLS__.emit({
    id: 'unique-id',
    category: 'model',
    type: 'sync.success',
    timestamp: Date.now(),
    priority: EventPriority.NORMAL,
    data: { modelName: 'cart', duration: 50 },
  });
}
```

### Event Schema

```ts
interface DevToolsEvent {
  id: string;
  category: 'prepaint' | 'model' | 'tx' | 'system';
  type: string;
  timestamp: number;
  priority: EventPriority; // 0=LOW, 1=NORMAL, 2=HIGH
  data: Record<string, unknown>;
}
```

**Event Types**

| Category     | Types                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **prepaint** | `capture`, `restore`, `handoff`, `hydration.error`, `storage.error`                                                                          |
| **model**    | `init`, `load`, `patch`, `replace`, `sync.start`, `sync.success`, `sync.error`, `broadcast`, `validation.error`                              |
| **tx**       | `start`, `step.start`, `step.success`, `step.retry`, `step.fail`, `commit`, `rollback.start`, `rollback.success`, `rollback.fail`, `timeout` |
| **system**   | `ready`, `error`                                                                                                                             |

---

## Browser Compatibility

| Browser | Version | Status               |
| ------- | ------- | -------------------- |
| Chrome  | 111+    | ✅ Fully supported   |
| Edge    | 111+    | ✅ Fully supported   |
| Firefox | -       | ❌ Not supported yet |
| Safari  | -       | ❌ Not supported yet |

**Why Chrome only?**

- Uses Manifest V3 service worker
- Chrome DevTools extension APIs
- Firefox support planned (needs different extension architecture)

---

## Contributing

DevTools is part of the FirstTx monorepo. To contribute:

```bash
# Clone repo
git clone https://github.com/joseph0926/firsttx.git
cd firsttx

# Install dependencies
pnpm install

# Develop devtools
cd packages/devtools
pnpm dev  # Watches and rebuilds on change

# Test in browser
# 1. Make changes
# 2. Rebuild: pnpm build
# 3. Reload extension in chrome://extensions
# 4. Refresh page
```

**Architecture**

```
packages/devtools/
├── src/
│   ├── bridge/        # Event collection & routing
│   ├── extension/     # Chrome extension (background, content, devtools)
│   └── panel/         # React UI (Timeline, EventList, EventDetail)
├── dist/              # Built extension (git-ignored)
└── package.json
```

---

## Related Packages

- [`@firsttx/prepaint`](https://www.npmjs.com/package/@firsttx/prepaint) - Instant page restoration
- [`@firsttx/local-first`](https://www.npmjs.com/package/@firsttx/local-first) - IndexedDB + React integration
- [`@firsttx/tx`](https://www.npmjs.com/package/@firsttx/tx) - Atomic transactions with rollback

---

## License

MIT © [joseph0926](https://github.com/joseph0926)
