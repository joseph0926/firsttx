# FirstTx

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-alpha-orange.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)

CSR apps with no blank screens, offline-ready, and consistent state management

> 한국어 버전은 [docs/README.ko.md](./docs/README.ko.md)를 참고해주세요

---

## The Problem with Current CSR

**1. Blank Screen**  
Users see nothing until the bundle loads.

**2. Lost State**  
Refreshing or going offline loses all work in progress.

**3. Complex Consistency**  
Optimistic updates, rollbacks, and cache invalidation must be managed separately.

---

## How FirstTx Solves This

**Prepaint** - A tiny script renders UI with real data before the main bundle arrives.

**Local-First** - IndexedDB-based models persist state and sync across tabs.

**Transaction** - Mutations, routing, and cache invalidation handled as a single atomic unit.

---

## Requirements

- Node.js 22+
- React 18+
- Supported browsers: Chrome/Edge/Safari (IndexedDB required)

---

## Quick Start

### Install

```bash
pnpm add @fristtx/prepaint @fristtx/local-first @fristtx/tx
# or
npm install @fristtx/prepaint @fristtx/local-first @fristtx/tx
```

### 1. Define a Model

```typescript
// models/cart.ts
import { defineModel } from '@fristtx/local-first';

export const cartModel = defineModel({
  name: 'cart',
  initial: { items: [] },
  ttl: 3600,
});
```

### 2. Create Prepaint Template

```tsx
// routes/cart.prepaint.tsx
'use prepaint';

export default prepaint(async () => {
  const cart = await cartModel.getSnapshot();
  return <CartView items={cart.items} />;
});
```

### 3. Use Transactions

```typescript
import { startTransaction } from '@fristtx/tx';

const tx = startTransaction('Add to cart');

tx.run(
  () => {
    cartModel.patch((draft) => {
      draft.items.push(newItem);
    });
  },
  { optimistic: true },
);

await tx.commit();
```

### 4. Configure Vite

```typescript
// vite.config.ts
import { prepaint } from '@fristtx/prepaint/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

Done! Your UI now appears instantly, with no blank screen.

---

## When to Use

### ✅ Good Fit

- Client-Side Rendering (CSR) apps
- Browsers with IndexedDB support
- Frequent state changes requiring immediate feedback
- Offline functionality needed

### ❌ Not Suitable

- SEO-critical pages (use SSR/SSG instead)
- Environments without browser storage
- Server-driven state management required

---

## Resources

- [Documentation](./docs/getting-started.md)
- [Example Project](./apps/demo)
- [API Reference](./docs/api)
- [Issues/Discussions](https://github.com/joseph0926/firsttx/issues)

---

## License

MIT

---

## Contact

- Repository: [https://github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- Email: joseph0926.dev@gmail.com
