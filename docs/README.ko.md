<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx 로고" width="720" />
</p>

# FirstTx

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/joseph0926/firsttx/badge)](https://scorecard.dev/viewer/?uri=github.com/joseph0926/firsttx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[문서](https://firsttx.store/ko) | [플레이그라운드](https://firsttx-playground.vercel.app) | [개발자 도구](https://chromewebstore.google.com/detail/firsttx-devtools/onpdifkipmmkajdhodmpphmlpbnopkdd)

> 영문 버전은 [README.md](../README.md)를 확인하세요.

**마지막 시각적 상태를 재생해 CSR 재방문 시 빈 화면 시간을 줄입니다**

## TL;DR

FirstTx는 CSR 재방문을 위한 세 가지 클라이언트 계층을 결합합니다.

- **Prepaint**: 앱 번들이 시작되기 전에 정제된 시각적 스냅샷 재생
- **Local-First**: React 모델 스냅샷을 IndexedDB에 저장하고 서버 데이터로 재검증
- **Tx**: 낙관적 단계를 재시도하고 역순 보상 롤백 실행

## 데모

<table>
<tr>
<td align="center">시나리오 목록</td>
<td align="center">검증 기준</td>
</tr>
<tr>
<td><img src="./assets/playground/home-ko-light.jpg" alt="FirstTx 플레이그라운드 시나리오 목록" /></td>
<td><img src="./assets/playground/lab-ko-light.jpg" alt="FirstTx 플레이그라운드 검증 기준" /></td>
</tr>
</table>

플레이그라운드는 Prepaint, Local-First, Tx의 동작을 아홉 개 시나리오로 나누어 보여 줍니다. 각 시나리오는 현재 계약과 일치하는 동작, 알려진 한계, 수정이 필요한 데모 중 하나로 표시합니다. 실행 결과가 연결되지 않았을 때는 임의의 성공 수치를 대신 보여 주지 않습니다.

> [플레이그라운드](https://firsttx-playground.vercel.app)에서 직접 실행하거나 [플레이그라운드 안내](../apps/playground/README.md)를 확인하세요.

## 문서

<table>
<tr>
<td align="center">도입 구성 선택</td>
<td align="center">작업별 탐색</td>
</tr>
<tr>
<td><img src="./assets/docs/landing-desktop-ko-light.png" alt="FirstTx 문서 도입 구성 선택 화면" /></td>
<td><img src="./assets/docs/navigation-mobile-en-dark.png" alt="FirstTx 문서 모바일 작업 내비게이션" /></td>
</tr>
</table>

문서는 제품 적합성 판단, 도입 구성 선택, 레이어별 구현, 동작 검증, 문제 해결과 정확한 공개 계약 조회 순서로 구성되어 있습니다.

[개요](https://firsttx.store/ko/docs/overview) · [빠른 시작](https://firsttx.store/ko/docs/getting-started) · [패턴](https://firsttx.store/ko/docs/patterns) · [문제 해결](https://firsttx.store/ko/docs/troubleshooting) · [레퍼런스](https://firsttx.store/ko/docs/reference)

## 왜 FirstTx인가요?

FirstTx는 CSR 아키텍처를 유지하면서 재사용 가능한 시각적 스냅샷, 영속적인 클라이언트 캐시, 보상 처리 기본 요소를 제공합니다.

## 설치

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

<details>
<summary>일부 패키지만 설치</summary>

- 재방문만: `pnpm add @firsttx/prepaint`
- 재방문 + 동기화: `pnpm add @firsttx/prepaint @firsttx/local-first`
- 동기화 + Tx: `pnpm add @firsttx/local-first @firsttx/tx`

> Tx는 Local-First를 의존성으로 필요로 합니다.

</details>

> ESM 전용입니다. CommonJS에서는 동적 `import()`를 사용하세요.

## 빠른 시작

### 1. Vite 플러그인

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

> `policy.routes`에 경로를 명시하기 전에는 Prepaint가 꺼져 있습니다. 스냅샷 복원은 항상 React root 밖의 비상호작용 오버레이를 사용합니다.

### 2. 진입점

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

> Tx를 이용한 낙관적 업데이트는 [Tx API 레퍼런스](https://firsttx.store/ko/docs/reference#tx)를 참고하세요.

## 사용하기 적합한 경우

| FirstTx 사용                | 다른 대안 고려                               |
| --------------------------- | -------------------------------------------- |
| 내부 도구(CRM, 대시보드)    | 공개 랜딩 페이지 → SSR/SSG                   |
| 잦은 재방문(하루 10회 이상) | 첫 방문 성능이 중요함 → SSR                  |
| SEO 요구사항 없음           | 항상 최신 데이터가 필요함 → Server-driven UI |

## 브라우저 지원

| 브라우저    | 최소 버전 | ViewTransition   |
| ----------- | --------- | ---------------- |
| Chrome/Edge | 111+      | 완전 지원        |
| Firefox     | 최신      | 점진적 대체 처리 |
| Safari      | 16+       | 점진적 대체 처리 |

## 문제 해결

**새로고침 시 UI가 중복됨**: `@firsttx/prepaint@0.11.0` 이상으로 업데이트하고 `createFirstTxRoot`를 통해 React를 마운트하세요. 별도 overlay 옵션은 필요하지 않습니다.

**스냅샷에서 자주 변경되는 내용**: 캡처된 visual snapshot에서 비워야 하는 내용에 `data-firsttx-volatile`을 추가하세요.

**TypeScript 오류**: `declare const __FIRSTTX_DEV__: boolean`을 추가하세요.

자세한 내용은 [GitHub Issues](https://github.com/joseph0926/firsttx/issues)에서 확인할 수 있습니다.

## 링크

- [API 레퍼런스](https://firsttx.store/ko/docs/reference)
- [플레이그라운드](https://firsttx-playground.vercel.app)
- [개발자 도구](https://chromewebstore.google.com/detail/firsttx-devtools/onpdifkipmmkajdhodmpphmlpbnopkdd)
- [GitHub](https://github.com/joseph0926/firsttx)
- [Issues](https://github.com/joseph0926/firsttx/issues)

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)
