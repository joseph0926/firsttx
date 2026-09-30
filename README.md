<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/joseph0926/firsttx/badge)](https://scorecard.dev/viewer/?uri=github.com/joseph0926/firsttx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 확인해주세요.

**Reduce blank time on CSR revisits by replaying the last visual state**

FirstTx is for frequently revisited React apps that need to stay client-rendered because
adopting SSR or a Next.js runtime is not practical. For infrequently used apps, the snapshot
layer is usually not worth the added complexity.

<table>
<tr>
<td align="center">Without Prepaint</td>
<td align="center">With Prepaint</td>
</tr>
<tr>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-01_vi2svy.gif" alt="Blank screen on a slow 4G revisit" /></td>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-02_tfmsy7.gif" alt="Snapshot replay on a slow 4G revisit" /></td>
</tr>
</table>

## Installation

```bash
pnpm add @firsttx/prepaint
```

> ESM-only. For CommonJS, use dynamic `import()`.

## Quick Start

### 1. Vite Plugin

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx({
      policy: { routes: ['/dashboard', '/cart'] },
    }),
  ],
});
```

> Prepaint is off until `policy.routes` explicitly opts paths in. Matching is exact. Snapshot restore always uses a non-interactive overlay outside the React root.

### 2. Entry Point

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

See the [Prepaint README](./packages/prepaint/README.md) for the full API.

## When to Use

| Use FirstTx                      | Consider Alternatives                      |
| -------------------------------- | ------------------------------------------ |
| Internal tools (CRM, dashboards) | Public landing pages → SSR/SSG             |
| Frequent revisits (10+/day)      | First-visit performance critical → SSR     |
| No SEO requirements              | Always need latest data → Server-driven UI |

## Browser Support

| Browser     | Min Version | ViewTransition    |
| ----------- | ----------- | ----------------- |
| Chrome/Edge | 111+        | Full              |
| Firefox     | Latest      | Graceful fallback |
| Safari      | 16+         | Graceful fallback |

## Troubleshooting

**UI duplicates on refresh**: Upgrade to `@firsttx/prepaint@0.11.0` or later and mount React through `createFirstTxRoot`. No overlay option is required.

**Frequently changing snapshot content**: Add `data-firsttx-volatile` to content that should be cleared from the captured visual snapshot.

**TypeScript errors**: Add `declare const __FIRSTTX_DEV__: boolean`.

More at [GitHub Issues](https://github.com/joseph0926/firsttx/issues).

## License

MIT © [joseph0926](https://github.com/joseph0926)
