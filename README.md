<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/joseph0926/firsttx/badge)](https://scorecard.dev/viewer/?uri=github.com/joseph0926/firsttx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Docs](https://www.firsttx.store) | [Playground](https://firsttx-playground.vercel.app) | [DevTools](https://chromewebstore.google.com/detail/firsttx-devtools/onpdifkipmmkajdhodmpphmlpbnopkdd)

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 확인해주세요.

**Eliminate blank screens on revisits - Restore last state instantly**

## TL;DR

FirstTx elevates CSR app revisit experience to SSR-level:

- **Prepaint**: Instantly restore last screen before JS loads (0ms blank screen)
- **Local-First**: Auto-sync IndexedDB + React (data persists on refresh)
- **Tx**: Optimistic updates + auto-rollback (safe even on failure)

## Demo

<table>
<tr>
<td align="center">Before</td>
<td align="center">After</td>
</tr>
<tr>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-01_vi2svy.gif" /></td>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-02_tfmsy7.gif" /></td>
</tr>
<tr>
<td align="center"><sub>Slow 4G: Blank screen</sub></td>
<td align="center"><sub>Slow 4G: Instant restore</sub></td>
</tr>
</table>

> See all demos in [Playground](https://firsttx-playground.vercel.app)

## Why FirstTx?

Traditional solutions for revisit UX (SSR/SSG) add infrastructure complexity. Manual IndexedDB requires 500+ lines of boilerplate. FirstTx provides SSR-level UX while keeping CSR architecture simple.

## Installation

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

<details>
<summary>Partial installation</summary>

- Revisit only: `pnpm add @firsttx/prepaint`
- Revisit + Sync: `pnpm add @firsttx/prepaint @firsttx/local-first`
- Sync + Tx: `pnpm add @firsttx/local-first @firsttx/tx`

> Tx requires Local-First as a dependency.

</details>

> ESM-only. For CommonJS, use dynamic `import()`.

## Quick Start

### 1. Vite Plugin

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx()],
});
```

### 2. Entry Point

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

### 3. Use in Component

```tsx
import { useSyncedModel } from '@firsttx/local-first';

function CartPage() {
  const { data: cart } = useSyncedModel(CartModel, () => fetch('/api/cart').then((r) => r.json()));
  if (!cart) return <Skeleton />;
  return <CartList items={cart.items} />;
}
```

> For optimistic updates with Tx, see [API Reference](./docs/API.md#tx).

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

**UI duplicates on refresh**: Enable `overlay: true` in Vite plugin.

**Hydration warnings**: Add `data-firsttx-volatile` to frequently changing elements.

**TypeScript errors**: Add `declare const __FIRSTTX_DEV__: boolean`.

More at [GitHub Issues](https://github.com/joseph0926/firsttx/issues).

## Links

- [API Reference](./docs/API.md)
- [Playground](https://firsttx-playground.vercel.app)
- [DevTools](https://chromewebstore.google.com/detail/firsttx-devtools/onpdifkipmmkajdhodmpphmlpbnopkdd)
- [GitHub](https://github.com/joseph0926/firsttx)
- [Issues](https://github.com/joseph0926/firsttx/issues)

## License

MIT © [joseph0926](https://github.com/joseph0926)
