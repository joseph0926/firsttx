<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

[Docs](https://www.firsttx.store) | [Playground](https://firsttx-playground.vercel.app) | [DevTools](https://chromewebstore.google.com/detail/firsttx-devtools/onpdifkipmmkajdhodmpphmlpbnopkdd)

**재방문 시 빈 화면 제거 - 마지막 상태를 즉시 복원합니다**

## TL;DR

FirstTx는 CSR 앱의 재방문 경험을 SSR 수준으로 끌어올립니다:

- **Prepaint**: JS 로드 전 마지막 화면 즉시 복원 (0ms 빈 화면)
- **Local-First**: IndexedDB + React 자동 동기화 (새로고침해도 데이터 유지)
- **Tx**: 낙관적 업데이트 + 자동 롤백 (실패해도 안전)

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
<td align="center"><sub>Slow 4G: 빈 화면</sub></td>
<td align="center"><sub>Slow 4G: 즉시 복원</sub></td>
</tr>
</table>

> 모든 데모는 [Playground](https://firsttx-playground.vercel.app)에서 확인하세요

## 왜 FirstTx인가?

재방문 UX를 위한 기존 솔루션(SSR/SSG)은 인프라 복잡도를 높입니다. IndexedDB 직접 구현은 500줄 이상의 보일러플레이트가 필요합니다. FirstTx는 CSR 아키텍처를 유지하면서 SSR급 UX를 제공합니다.

## Installation

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

<details>
<summary>부분 설치</summary>

- 재방문만: `pnpm add @firsttx/prepaint`
- 재방문 + 동기화: `pnpm add @firsttx/prepaint @firsttx/local-first`
- 동기화 + Tx: `pnpm add @firsttx/local-first @firsttx/tx`

> Tx는 Local-First를 의존성으로 필요로 합니다.

</details>

> ESM-only. CommonJS는 동적 `import()`를 사용하세요.

## Quick Start

### 1. Vite 플러그인

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx()],
});
```

### 2. 진입점 설정

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

### 3. 컴포넌트에서 사용

```tsx
import { useSyncedModel } from '@firsttx/local-first';

function CartPage() {
  const { data: cart } = useSyncedModel(CartModel, () => fetch('/api/cart').then((r) => r.json()));
  if (!cart) return <Skeleton />;
  return <CartList items={cart.items} />;
}
```

> Tx를 이용한 낙관적 업데이트는 [API Reference](./API.ko.md#tx)를 참조하세요.

## 적합한 경우

| FirstTx 사용              | 다른 솔루션 고려                         |
| ------------------------- | ---------------------------------------- |
| 내부 도구 (CRM, 대시보드) | 공개 랜딩 페이지 → SSR/SSG               |
| 잦은 재방문 (10+/일)      | 최초 방문 성능 중요 → SSR                |
| SEO 불필요                | 항상 최신 데이터 필수 → Server-driven UI |

## 브라우저 지원

| 브라우저    | 최소 버전 | ViewTransition    |
| ----------- | --------- | ----------------- |
| Chrome/Edge | 111+      | 완전 지원         |
| Firefox     | 최신      | Graceful fallback |
| Safari      | 16+       | Graceful fallback |

## 문제 해결

**새로고침 시 UI 중복**: Vite 플러그인에서 `overlay: true` 활성화.

**Hydration 경고**: 자주 변하는 요소에 `data-firsttx-volatile` 추가.

**TypeScript 오류**: `declare const __FIRSTTX_DEV__: boolean` 추가.

더 많은 해결책은 [GitHub Issues](https://github.com/joseph0926/firsttx/issues)에서.

## 링크

- [API Reference](./API.ko.md)
- [Playground](https://firsttx-playground.vercel.app)
- [DevTools](https://chromewebstore.google.com/detail/firsttx-devtools/onpdifkipmmkajdhodmpphmlpbnopkdd)
- [GitHub](https://github.com/joseph0926/firsttx)
- [Issues](https://github.com/joseph0926/firsttx/issues)

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)
