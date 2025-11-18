# @firsttx/devtools

## 0.1.11

### Patch Changes

- Updated dependencies
  - @firsttx/prepaint@0.5.0

## 0.1.10

### Patch Changes

- Updated dependencies
  - @firsttx/local-first@0.6.0

## 0.1.9

### Patch Changes

- Updated dependencies
  - @firsttx/tx@0.5.1

## 0.1.8

### Patch Changes

- Updated dependencies
  - @firsttx/tx@0.5.0

## 0.1.7

### Patch Changes

- Updated dependencies
  - @firsttx/tx@0.4.1

## 0.1.6

### Patch Changes

- Updated dependencies
  - @firsttx/local-first@0.5.3

## 0.1.5

### Patch Changes

- Updated dependencies
  - @firsttx/local-first@0.5.2

## 0.1.4

### Patch Changes

- Updated dependencies
  - @firsttx/local-first@0.5.1

## 0.1.3

### Patch Changes

- Updated dependencies
  - @firsttx/local-first@0.5.0

## 0.1.2

### Patch Changes

### 🐛 Bug Fixes

- **Permissions**: Fixed permission issues in Chrome extension ([#375f9c6](commit-hash))

### 🔄 Refactoring

- **BroadcastChannel Fallback**: Added fallback for unsupported environments ([#2612103](commit-hash))

### 🎨 Chore

- Fixed icon size in extension manifest ([#71759df](commit-hash))
- Added metadata for Chrome Web Store listing ([#c834716](commit-hash))
- Added devtools documentation link ([#9d15a79](commit-hash))

## 0.1.1

### Patch Changes

- fix runtime check

## 0.1.0

### Minor Changes

### Added

#### Core Infrastructure

- **Bridge System**: Event collection and routing between page context and DevTools extension
  - Priority-based event buffering (HIGH/NORMAL/LOW) with configurable batch intervals
  - BroadcastChannel integration for same-tab cross-context communication
  - IndexedDB persistence for high-priority events
  - Circular buffer implementation to prevent memory leaks (500 events default)
  - Command system for bidirectional communication

- **Browser Extension**: Chrome DevTools integration
  - Manifest V3 compliant extension architecture
  - Background service worker for event routing across tabs
  - Content script injection for bridge initialization
  - Custom DevTools panel registration
  - Per-tab event buffering and connection management

#### DevTools Panel (Phase 1: Enhanced UX)

- **ResizablePanel Component**: Drag-to-resize functionality for EventDetail panel
  - Configurable width constraints (300px - 800px)
  - LocalStorage persistence for user preferences
  - Smooth resize interaction with active state feedback

- **Advanced Filtering System**: Multi-dimensional event filtering
  - Category filter: All / Prepaint / Model / Tx / System
  - Priority filter: All / Low / Normal / High
  - Full-text search across event category, type, and data
  - Error-only toggle for quick issue debugging
  - Real-time filter with filtered/total event count display

- **Enhanced EventDetail Component**
  - Collapsible JSON view with expand/collapse controls
  - Copy-to-clipboard for entire event or data only
  - Sticky header for better scrolling experience
  - Priority and category badges with color coding
  - Formatted timestamp display

#### DevTools Panel (Phase 2: Timeline Visualization)

- **Timeline Component**: SVG-based event visualization
  - 4-lane layout aligned with package categories (Prepaint/Model/Tx/System)
  - Automatic time scaling with smart interval markers
  - Duration formatting (μs/ms/s/m) with intelligent unit selection
  - Zebra-striped lanes for visual clarity
  - Responsive width calculation based on event duration

- **Event Grouping**: Intelligent event correlation
  - Transaction grouping by `txId` with lifecycle tracking
  - Model grouping by `modelName` with sync status
  - Group status visualization (pending/success/error)
  - Connection lines showing event relationships with status-based coloring

- **Interactive Features**
  - Click-to-select event with visual highlighting
  - Hover tooltips showing event details and timing
  - Synchronized selection between Timeline and EventList
  - Collapsible timeline to maximize workspace

- **Layout Switching**: Flexible panel arrangement
  - Default mode: 2-column layout (EventList | EventDetail)
  - Timeline mode: 3-row layout (Timeline / EventList | EventDetail)
  - Toolbar toggle button for instant layout switching

### Technical Details

#### Event Schema

- Standardized event structure across all categories
- EventPriority enum for type-safe priority handling (LOW=0, NORMAL=1, HIGH=2)
- Unique event IDs using timestamp + random suffix
- Category-specific data types with TypeScript strict typing

#### Performance Optimizations

- Circular buffer prevents unbounded memory growth
- Batch processing for normal and low priority events (100ms/500ms intervals)
- High-priority events bypass batching for immediate visibility
- SVG rendering optimized for hundreds of events
- Memoized calculations for timeline scaling and grouping

#### Browser Compatibility

- Chrome 111+ (ViewTransition support optional)
- Manifest V3 service worker architecture
- Graceful degradation when extension not installed

### Package Structure

```
packages/devtools/
├── src/
│   ├── bridge/        # Event collection and routing
│   ├── extension/     # Chrome extension components
│   └── panel/         # React-based DevTools UI
├── dist/              # Built extension (load unpacked)
└── package.json
```

### Known Limitations

- Timeline zoom/pan not implemented (planned for future release)
- Maximum 500 events in buffer (configurable)
- Chrome/Edge only (Firefox support planned)
- No event export/import functionality yet

### Migration Guide

This is the initial release. To integrate with existing FirstTx applications:

1. Install the extension: Load `/packages/devtools/dist` as unpacked extension in Chrome
2. Ensure all FirstTx packages are updated to versions with DevTools integration:
   - `@firsttx/prepaint@0.3.3+`
   - `@firsttx/local-first@0.4.1+`
   - `@firsttx/tx@0.2.2+`
3. Open Chrome DevTools → "FirstTx" tab
4. Events will automatically appear when using FirstTx features

No code changes required in applications using FirstTx.

### Patch Changes

- Updated dependencies
  - @firsttx/local-first@0.4.2
  - @firsttx/prepaint@0.4.1
  - @firsttx/tx@0.3.1
