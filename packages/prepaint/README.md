# @firsttx/prepaint

**Instant Replay for CSR Apps - 0ms Blank Screen on Revisit**

Prepaint is the render layer of FirstTx that captures and instantly replays your app's last visual state, eliminating blank screens on return visits.

---

## 📖 What is Prepaint?

Prepaint solves a fundamental CSR problem: **every page load starts with a blank screen**. Even if data is cached, users must wait for:

1. HTML parsing
2. JavaScript download
3. React initialization
4. Component rendering

**Prepaint's approach:**

```
Traditional CSR:
User visits → Blank screen → JS loads → React renders → Content appears (2000ms)

With Prepaint:
User revisits → Last snapshot instantly appears (0ms) → React hydrates → Fresh data syncs (800ms)
```

---

## 🎯 Core Concepts

### 1. Capture (beforeunload)

Before the user leaves, Prepaint saves:

- **DOM snapshot**: `document.body.innerHTML`
- **Styles**: All `<style>` tags
- **Metadata**: route, timestamp

```tsx
// Happens automatically when you use createFirstTxRoot()
window.addEventListener('beforeunload', () => {
  // Saves to IndexedDB: { dom, styles, route, timestamp }
});
```

### 2. Boot (0ms injection)

When the user returns, a tiny inline script runs **before your main bundle**:

```tsx
// This runs in <head> (auto-injected by Vite plugin in future)
import { boot } from '@firsttx/prepaint';
boot(); // Reads IndexedDB → Injects DOM instantly
```

### 3. Handoff (React takeover)

Your React app loads and decides what to do:

```tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(
  document.getElementById('root')!,
  <App />,
  { transition: true }, // Smooth animations
);

// Internally:
// 1. Check if snapshot exists (handoff() → 'has-prepaint' | 'cold-start')
// 2. If yes: hydrateRoot() (React reuses DOM ~80% success rate)
// 3. If no: createRoot() (normal CSR)
// 4. ViewTransition wraps hydration for smooth visual updates
```

---

## 🚀 Quick Start

### Installation

```bash
pnpm add @firsttx/prepaint @firsttx/local-first
```

### Basic Setup (3 steps)

#### Step 1: Replace your render call

```tsx
// Before
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<App />);

// After
import { createFirstTxRoot } from '@firsttx/prepaint';
createFirstTxRoot(document.getElementById('root')!, <App />);
```

That's it! Capture happens automatically on `beforeunload`.

#### Step 2: (Optional) Add boot script

```html
<!-- index.html - for maximum speed -->
<head>
  <script type="module">
    import { boot } from '@firsttx/prepaint';
    boot();
  </script>
</head>
```

**Note:** In v0.1.0, this requires manual setup. Vite plugin will auto-inject this in v0.2.0.

#### Step 3: Use with Local-First models

Prepaint works best with `@firsttx/local-first` for data persistence:

```tsx
import { defineModel } from '@firsttx/local-first';

const ProductsModel = defineModel('products', {
  schema: z.object({ items: z.array(...) }),
  ttl: 5 * 60 * 1000
});

// When React hydrates, useModel will read cached data
function ProductsPage() {
  const [products] = useModel(ProductsModel);
  // Renders immediately with snapshot, then syncs with server
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│ Phase 1: Capture (beforeunload)        │
├─────────────────────────────────────────┤
│ setupCapture() → addEventListener       │
│ User leaves → Snapshot saved to IDB     │
│ { dom, styles, route, timestamp }       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Phase 2: Boot (0ms)                     │
├─────────────────────────────────────────┤
│ HTML loads → Inline script runs         │
│ boot() → Read IDB → Inject DOM          │
│ User sees last state instantly          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Phase 3: Handoff (500ms)                │
├─────────────────────────────────────────┤
│ Main bundle arrives                     │
│ createFirstTxRoot() calls handoff()     │
│ Strategy: 'has-prepaint' | 'cold-start' │
│ React: hydrateRoot() or createRoot()    │
│ ViewTransition: Smooth visual updates   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Phase 4: Sync (800ms)                   │
├─────────────────────────────────────────┤
│ Server data arrives                     │
│ Local-First model.patch()               │
│ React re-renders (minimal changes)      │
│ ViewTransition: Smooth content update   │
└─────────────────────────────────────────┘
```

---

## 📚 API Reference

### `boot()`

Runs in inline script to inject snapshot before main bundle.

```tsx
import { boot } from '@firsttx/prepaint';

boot(); // No options in v0.1.0
```

**Behavior:**

1. Reads current route from `window.location.pathname`
2. Opens IndexedDB `firsttx` → `snapshots` store
3. Looks for snapshot matching route
4. If found + not expired → Injects DOM + styles
5. Adds `data-prepaint="true"` to `<body>`

**Performance:** Target <20ms (includes IDB read + DOM injection)

---

### `createFirstTxRoot(container, element, options?)`

Drop-in replacement for `createRoot()` with automatic capture and intelligent hydration.

```tsx
createFirstTxRoot(
  container: HTMLElement,
  element: ReactElement,
  options?: {
    transition?: boolean;  // Use ViewTransition? (default: true)
    onCapture?: (snapshot: Snapshot) => void;  // Capture hook
    onHandoff?: (strategy: HandoffStrategy) => void;  // Handoff hook
  }
): Root
```

**Example with options:**

```tsx
createFirstTxRoot(document.getElementById('root')!, <App />, {
  transition: true,
  onHandoff: (strategy) => {
    console.log(`Handoff strategy: ${strategy}`);
    // 'has-prepaint' → React will try to reuse DOM
    // 'cold-start' → Normal CSR
  },
});
```

**Internal flow:**

```tsx
// Simplified implementation
export function createFirstTxRoot(container, element, options) {
  // 1. Setup capture (first call only)
  setupCapture();

  // 2. Determine strategy
  const strategy = handoff(); // Checks body[data-prepaint]

  // 3. Hydrate or render
  if (strategy === 'has-prepaint') {
    if (options?.transition && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        hydrateRoot(container, element);
      });
    } else {
      hydrateRoot(container, element);
    }
  } else {
    createRoot(container).render(element);
  }
}
```

---

### `handoff()`

Determines whether a prepaint snapshot exists and returns strategy.

```tsx
import { handoff } from '@firsttx/prepaint';

const strategy = handoff();
// Returns: 'has-prepaint' | 'cold-start'
```

**Logic:**

```tsx
export function handoff(): HandoffStrategy {
  return document.body?.hasAttribute('data-prepaint') ? 'has-prepaint' : 'cold-start';
}
```

**When to use directly:** Rarely needed—`createFirstTxRoot()` calls this internally. Useful for custom rendering logic.

---

### `setupCapture(options?)`

Registers `beforeunload` listener to capture snapshots. Called automatically by `createFirstTxRoot()`.

```tsx
import { setupCapture } from '@firsttx/prepaint';

setupCapture({
  routes?: string[];  // Only capture these routes (default: all)
  onCapture?: (snapshot: Snapshot) => void;
});
```

**Example - Selective capture:**

```tsx
setupCapture({
  routes: ['/cart', '/products'],
  onCapture: (snapshot) => {
    console.log(`Captured ${snapshot.route} at ${snapshot.timestamp}`);
  },
});
```

---

## 🎨 How ViewTransition Works

When `transition: true` (default), Prepaint wraps React hydration/updates in ViewTransition API:

```tsx
// Automatic smooth transition
document.startViewTransition(() => {
  hydrateRoot(container, element);
});
```

**Visual result:**

- Snapshot (stale data) → Fresh data: smooth crossfade
- Rollback (Tx failure): smooth rewind animation
- No flicker or layout shift

**Browser support:**

- Chrome 111+, Edge 111+
- Graceful fallback: Normal render (no animation)

---

## ⚙️ Configuration

### TTL (Time To Live)

Snapshots expire after 7 days by default:

```tsx
// In storage.ts (Local-First package)
export const STORAGE_CONFIG = {
  MAX_SNAPSHOT_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

**To customize:** Currently requires modifying source. Configuration API coming in v0.2.0.

---

## 🔍 Debugging

### Check if snapshot exists

```tsx
// Open DevTools console
indexedDB.open('firsttx').onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('snapshots', 'readonly');
  const store = tx.objectStore('snapshots');
  store.getAll().onsuccess = (e) => {
    console.log('Snapshots:', e.target.result);
  };
};
```

### Verify capture is working

```tsx
createFirstTxRoot(document.getElementById('root')!, <App />, {
  onCapture: (snapshot) => {
    console.log('✅ Snapshot captured:', snapshot);
  },
});
```

### Check handoff strategy

```tsx
createFirstTxRoot(document.getElementById('root')!, <App />, {
  onHandoff: (strategy) => {
    if (strategy === 'has-prepaint') {
      console.log('⚡ Prepaint snapshot found - hydrating');
    } else {
      console.log('❄️ Cold start - no snapshot');
    }
  },
});
```

---

## 🎯 Performance Expectations

| Metric                 | Target    | Notes                    |
| ---------------------- | --------- | ------------------------ |
| **Boot time**          | <20ms     | IDB read + DOM injection |
| **Snapshot size**      | ~50-200KB | Compressed HTML + CSS    |
| **Hydration success**  | >80%      | React reuses DOM         |
| **Hydration mismatch** | <20%      | React patches DOM        |

**Hydration mismatch scenarios:**

- Dynamic timestamps changed
- CSS-in-JS with random class names
- Conditional rendering based on client-only state

**Solution:** React handles mismatches automatically—no action needed.

---

## 🚧 Current Limitations (v0.1.0)

| Limitation             | Impact                       | Planned Fix                 |
| ---------------------- | ---------------------------- | --------------------------- |
| **Manual boot script** | Must add to HTML manually    | Vite plugin (v0.2.0)        |
| **beforeunload only**  | Browser crash loses snapshot | visibilitychange (v0.2.0)   |
| **No SPA routing**     | Full page loads only         | Router integration (v0.2.0) |
| **No multi-tab sync**  | Each tab has own snapshot    | BroadcastChannel (v0.2.0)   |

---

## 🗺️ Roadmap

### v0.2.0 (Phase 1)

- ⏳ Vite plugin (auto-inject boot script)
- ⏳ visibilitychange capture (crash recovery)
- ⏳ React Router integration
- ⏳ TanStack Router integration

### v1.0.0 (Production)

- Next.js plugin
- Multi-tab sync
- Configuration API
- DevTools integration

---

## 💡 Tips & Best Practices

### 1. Combine with Local-First for maximum effect

```tsx
// ✅ Best: Prepaint (visual) + Local-First (data)
const ProductsModel = defineModel('products', { ... });

function ProductsPage() {
  const [products] = useModel(ProductsModel);
  // Instant visual + instant data = perfect UX
}
```

### 2. Use transition: true for smooth updates

```tsx
// ✅ Recommended
createFirstTxRoot(root, <App />, { transition: true });

// ❌ Only disable if ViewTransition causes issues
createFirstTxRoot(root, <App />, { transition: false });
```

### 3. Test both cold-start and warm-start paths

```tsx
// Clear snapshots to test cold start
indexedDB.deleteDatabase('firsttx');

// Reload to test warm start (with snapshot)
```

### 4. Avoid capturing routes with sensitive data

```tsx
// Don't capture login/payment pages
setupCapture({
  routes: ['/cart', '/products'], // Whitelist only
});
```

---

## 🤔 FAQ

**Q: Does this work with SSR/Next.js?**  
A: Not yet. Prepaint is designed for pure CSR apps. SSR support is not planned for v1.0.

**Q: What if React hydration completely fails?**  
A: React will patch the entire DOM. ViewTransition makes this smooth, but it's slower than successful hydration.

**Q: Can I capture specific components instead of full DOM?**  
A: Not in v0.1.0. Full-page capture only. Component-level capture may come in future versions.

**Q: Does this increase memory usage?**  
A: Minimally. Snapshots live in IndexedDB (disk), not memory. Memory impact ~100KB during boot script execution.

**Q: What about SEO?**  
A: Prepaint is for CSR apps (logged-in users, no SEO needed). For SEO, use SSR/RSC.

---

## 📄 License

MIT © [joseph0926](https://github.com/joseph0926)

---

## 🔗 Related

- [FirstTx Main Repo](https://github.com/joseph0926/firsttx)
- [@firsttx/local-first](../local-first) - Data persistence layer
- [@firsttx/tx](../tx) - Transaction layer
- [Live Demo](https://firsttx-demo.vercel.app/)
