<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**CSR 앱의 재방문 경험을 SSR처럼**

두 번째 방문부터는 마지막 상태를 즉시 복원하고, 낙관적 업데이트 실패 시 안전하게 롤백합니다. 서버 인프라를 늘리지 않고도 빠르고 일관된 사용자 경험을 제공합니다.

---

## 목차

- 핵심 가치
- 빠른 시작
- 오버레이 모드(안전한 프리페인트)
- 아키텍처
- 패키지
- 핵심 기능
- Vite 플러그인(고급)
- TypeScript & 전역 변수
- 라우터 연동 참고
- 성능 목표
- 설계 철학
- 브라우저 지원
- 문제 해결
- 예제
- 라이선스
- 링크

---

## 핵심 가치

### 문제: CSR 재방문 경험

```
매 방문: 빈 화면 → API 대기 → 데이터 표시
새로고침 시 진행 중이던 작업 소실
낙관적 업데이트 실패 시 부분 롤백 불일치
서버 동기화 보일러플레이트가 컴포넌트를 어지럽힘
```

### 해결: FirstTx = Prepaint + Local-First + Tx

```
[재방문 시나리오]
1. /cart 재방문 → 어제의 3개 아이템을 즉시 표시(~0ms)
2. 메인 앱 로드 → React 하이드레이션 → 스냅샷 DOM 재사용
3. 서버 동기화 → ViewTransition으로 부드럽게 갱신(3 → 5개)
4. “+1” 클릭 → Tx 시작 → 낙관적 패치 → 서버 오류
5. 자동 롤백 → ViewTransition으로 원상복귀
```

**결과**

- 재방문 시 빈 화면 시간 ≈ 0ms
- 스냅샷 → 최신 데이터 전환 시 자연스러운 애니메이션
- 낙관적 업데이트 실패에도 일관된 원자적 롤백
- 서버 동기화 보일러플레이트 약 90% 감소
- 오프라인에서도 마지막 상태 보존

---

## 빠른 시작

### 설치

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### 기본 설정

#### 1) Vite 플러그인

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx(), // 스냅샷 복원을 위한 부트 스크립트 자동 주입
  ],
});
```

#### 2) 모델 정의

```ts
// models/cart-model.ts
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

export const CartModel = defineModel('cart', {
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        qty: z.number(),
      }),
    ),
  }),
  ttl: 5 * 60 * 1000, // 5분
});
```

#### 3) 진입점

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

#### 4) 로컬 전용

```tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart-model';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);
  if (!cart) return <Skeleton />;
  return (
    <div>
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

#### 5) 서버 동기화 포함

```tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart-model';

async function fetchCart() {
  const res = await fetch('/api/cart');
  return res.json();
}

function CartPage() {
  const {
    data: cart,
    patch,
    sync,
    isSyncing,
    error,
    history,
  } = useSyncedModel(CartModel, fetchCart, {
    syncOnMount: 'stale', // 마운트 시 스테일이면 동기화 (기본값)
    onSuccess: (d) => console.log('Synced:', d),
    onError: (e) => console.error(e),
  });

  if (!cart) return <Skeleton />;
  if (error) return <ErrorBanner error={error} onRetry={sync} />;

  return (
    <div>
      {isSyncing && <SyncIndicator />}
      {history.isStale && <Badge>Updating...</Badge>}
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

**syncOnMount 전략**

| 전략             | 사용 시점                   | 예시                                 |
| ---------------- | --------------------------- | ------------------------------------ |
| `'stale'` (기본) | TTL 초과 시 동기화          | 대부분의 경우 - 신선도와 UX 균형     |
| `'always'`       | 마운트마다 항상 최신 데이터 | 중요 데이터 - 시세, 잔액             |
| `'never'`        | 수동 동기화만               | 드래프트, 오프라인 우선, 사용자 제어 |

```tsx
// 수동 동기화 (syncOnMount: 'never')
const { data, sync, isSyncing } = useSyncedModel(Model, fetcher, {
  syncOnMount: 'never',
});
<button onClick={sync} disabled={isSyncing}>
  {isSyncing ? 'Syncing…' : 'Refresh'}
</button>;
```

#### 6) Tx로 낙관적 업데이트

```ts
import { startTransaction } from '@firsttx/tx';
import { CartModel } from './models/cart-model';

async function addItem(product) {
  const tx = startTransaction({ transition: true });

  await tx.run(
    () =>
      CartModel.patch((d) => {
        d.items.push({ ...product, qty: 1 });
      }),
    {
      compensate: () =>
        CartModel.patch((d) => {
          d.items.pop();
        }),
    },
  );

  await tx.run(() => api.post('/cart/add', { id: product.id }));

  await tx.commit();
}
```

---

## 오버레이 모드(안전한 프리페인트)

일부 클라이언트 라우터나 서드파티 코드가 시작 시점에 루트 노드를 일시적으로 추가/재배치하는 경우가 있습니다. 이때 스냅샷을 바로 `#root`에 주입하면 새로고침 시 **UI 중복**이 발생할 수 있습니다. 이를 방지하기 위해 **오버레이 모드**를 제공합니다.

- 스냅샷을 **고정(fixed), pointer-events:none** 오버레이에 **Shadow DOM**으로 렌더링
- 실제 앱은 오버레이 아래에서 하이드레이션 수행
- 하이드레이션 안정화 후, 오버레이와 프리페인트 스타일 제거
- 결과: 즉시 시각적 피드백 + 중복 렌더링 위험 제거

**오버레이 활성화 방법**

1. **Vite 플러그인 옵션**(권장)

```ts
firstTx({
  overlay: true, // 전역 활성화
  overlayRoutes: ['/prepaint/'], // 일부 경로 프리픽스만 활성화
});
```

2. **LocalStorage 토글**(빌드 없이)

```js
localStorage.setItem('firsttx:overlay', '1');
// 또는 경로 프리픽스 리스트
localStorage.setItem('firsttx:overlayRoutes', '/prepaint/,/cart/');
```

3. **런타임 전역**

```html
<script>
  window.__FIRSTTX_OVERLAY__ = true;
</script>
```

**변동 영역 표시(선택)**
방문마다 자주 바뀌는 텍스트(타임스탬프, 카운터 등)는 스냅샷에서 비워 두면(= 하이드레이션 불일치 완화) 안전합니다.

```html
<span data-firsttx-volatile>42 notifications</span>
```

---

## 아키텍처

### 3-레이어 시스템

```
┌──────────────────────────────────────────┐
│   렌더 레이어 (Prepaint)                 │
│   - 즉시 복원                           │
│   - beforeunload / pagehide 캡처        │
│   - 오버레이 + 하이드레이션 가드         │
└──────────────────────────────────────────┘
                     ↓ read
┌──────────────────────────────────────────┐
│   Local-First (데이터 레이어)             │
│   - IndexedDB 스냅샷/모델 관리            │
│   - React 통합(useSyncExternalStore)     │
│   - 메모리 캐시 브리지                   │
│   - useSyncedModel(서버 동기화)          │
└──────────────────────────────────────────┘
                     ↑ write
┌──────────────────────────────────────────┐
│   Tx (실행 레이어)                        │
│   - 낙관적 업데이트                       │
│   - 원자적 롤백                           │
│   - ViewTransition 통합                   │
└──────────────────────────────────────────┘
```

### 데이터 흐름

```
[부트 - ~0ms]
HTML 로드 → Prepaint 부트 → 스냅샷 읽기 → 오버레이/직접 주입 렌더

[핸드오프]
createFirstTxRoot() → 오버레이 아래에서 하이드레이션 or 주입 DOM 재활용
→ 하이드레이션 가드로 단일 루트 보장 → 프리페인트 정리

[동기화]
useSyncedModel → 스테일 감지 → fetcher()
→ 선택적 ViewTransition → 최소 리렌더

[상호작용]
Tx → 낙관적 패치 → 서버 호출
→ 성공: 커밋 / 실패: ViewTransition과 함께 자동 롤백
```

---

## 패키지

### [`@firsttx/prepaint`](./packages/prepaint)

렌더 레이어 – 즉시 복원 시스템

- `boot()` – 부트 스크립트(IndexedDB → DOM)
- `createFirstTxRoot()` – React 하이드레이션 가드/정리 포함 헬퍼
- `handoff()` – `'has-prepaint' | 'cold-start'` 결정
- `setupCapture()` – `beforeunload`, `pagehide`, `visibilitychange` 시 캡처
- 오버레이(Shadow DOM) 렌더링

### [`@firsttx/local-first`](./packages/local-first)

데이터 레이어 – IndexedDB + React

- `defineModel()` / `useModel()` / `useSyncedModel()`
- 메모리 캐시 브리지(useSyncExternalStore)
- TTL, 버전, 히스토리 메타데이터

### [`@firsttx/tx`](./packages/tx)

실행 레이어 – 낙관적 + 원자적

- `startTransaction()` → `tx.run()` → `tx.commit()`
- 보상(compensate) 핸들러, 기본 재시도
- ViewTransition 통합

---

## 핵심 기능

1. **즉시 복원**(~0ms 체감)
2. **안전한 하이드레이션**(오버레이 + 가드)
3. **서버 동기화 단순화**(보일러플레이트 최소화)
4. **원자적 롤백**(Tx)
5. **부드러운 전환**(ViewTransition)
6. **로컬 우선**(오프라인에서도 마지막 상태 유지)

---

## Vite 플러그인(고급)

```ts
export interface FirstTxPluginOptions {
  inline?: boolean; // 기본: true
  minify?: boolean; // 기본: !dev
  injectTo?: 'head' | 'head-prepend' | 'body' | 'body-prepend'; // 기본: 'head-prepend'
  nonce?: string | (() => string); // CSP nonce 지원
  overlay?: boolean; // 기본: undefined(비활성)
  overlayRoutes?: string[]; // 예: ['/prepaint/','/cart']
  devFlagOverride?: boolean; // dev/prod define 강제
}
```

**예시**

특정 영역에만 오버레이 적용 + CSP nonce 설정

```ts
firstTx({
  overlayRoutes: ['/prepaint/'],
  nonce: () => process.env.CSP_NONCE ?? '',
});
```

---

## TypeScript & 전역 변수

Prepaint는 빌드 시 `define`으로 전역을 주입합니다.

- `__FIRSTTX_DEV__` – 플러그인이 설정하는 boolean(라이브러리 내부에서 `import.meta.env` 대신 사용)
- `window.__FIRSTTX_OVERLAY__?: boolean` – 런타임에서 오버레이 강제 토글

모노레포/엄격 TS 설정에서 전역 선언이 필요하면 다음을 추가하세요.

```ts
// src/types/firsttx-globals.d.ts
declare const __FIRSTTX_DEV__: boolean;
declare global {
  interface Window {
    __FIRSTTX_OVERLAY__?: boolean;
  }
}
export {};
```

---

## 라우터 연동 참고

- **React Router(v7+)**: 초기 하이드레이션 경고(“HydrateFallback 없음”)가 보이면 폴백 엘리먼트를 제공하세요.

```tsx
import { RouterProvider } from 'react-router-dom';
<RouterProvider router={router} hydrateFallbackElement={<div />} />;
```

- 복잡한 레이아웃 셸/포털/여러 루트가 초기화 단계에서 등장하는 앱이라면 **오버레이 모드** 사용을 권장합니다.

---

## 성능 목표

| 지표                     | 목표   | 상태       |
| ------------------------ | ------ | ---------- |
| BlankScreenTime (BST)    | ~0ms   | ✅ ~0ms    |
| PrepaintTime (PPT)       | <20ms  | ✅ ~15ms   |
| HydrationSuccess         | >80%   | ✅ ~82%    |
| ViewTransitionSmooth     | >90%   | ✅ ~95%    |
| BootScriptSize           | <2KB   | ✅ ~1.74KB |
| ReactSyncLatency         | <50ms  | ✅ ~42ms   |
| TxRollbackTime           | <100ms | ✅ ~85ms   |
| SyncBoilerplateReduction | >90%   | ✅ ~90%    |

---

## 설계 철학

**적합한 경우**

- 내부 도구(CRM, 대시보드, 어드민)
- 재방문이 잦은 앱(하루 10회+)
- SEO 비요구(로그인 이후 앱)
- 복잡한 클라이언트 상호작용
- 서버 인프라 최소화 지향

**적합하지 않은 경우**

- 공개 랜딩/마케팅 사이트(SSR/SSG 권장)
- 최초 방문 성능이 최우선인 앱
- 항상 최신 데이터가 필수인 앱
- 매우 단순한 CRUD

SSR/RSC와의 트레이드오프

| 항목          | FirstTx                | SSR/RSC   |
| ------------- | ---------------------- | --------- |
| 최초 방문     | 일반 CSR(느릴 수 있음) | 빠름      |
| 재방문        | ~0ms(즉시)             | 빠름      |
| 데이터 신선도 | 스냅샷 → 동기화        | 항상 최신 |
| 서버 복잡도   | 최소(단순 API)         | 필수      |
| SEO           | 대상 아님              | 완전 지원 |
| 오프라인      | 마지막 상태 보존       | 미지원    |

---

## 브라우저 지원

- **Chrome/Edge**: 111+ (ViewTransition 완전 지원)
- **Firefox/Safari**: 최신 (점진적 향상, ViewTransition 미지원 시 자동 폴백)
- **Mobile**: iOS Safari 16+, Chrome Android 111+

> 핵심 기능은 어디서나 동작하며, ViewTransition은 선택적 향상입니다.

---

## 문제 해결

**새로고침 시 UI가 중복 표시됨**
**오버레이 모드**를 사용하세요. 스냅샷을 Shadow DOM 오버레이에 렌더링하고, 앱이 안정적으로 하이드레이트되면 오버레이를 제거해 다중 루트 이슈를 원천 차단합니다.

**매 방문마다 바뀌는 텍스트로 하이드레이션 불일치**
해당 영역에 `data-firsttx-volatile`을 지정하세요. 스냅샷에선 비워 저장하여 불일치를 줄입니다.

**TypeScript 오류: `import.meta.env`**
FirstTx 내부에선 플러그인이 주입한 `__FIRSTTX_DEV__`를 사용합니다. 앱에서 별도 설정은 필요 없습니다. 전역 선언 경고가 뜨면 위 [TypeScript & 전역 변수](#typescript--전역-변수)의 `d.ts`를 추가하세요.

**CSP**
부트 스크립트에 nonce가 필요하면 플러그인 `nonce` 옵션을 설정하세요.

---

## 예제

- [`apps/demo`](./apps/demo) — 간단한 장바구니 데모
- [`apps/playground`](./apps/playground) — 인터랙티브 시나리오(Prepaint, Sync, Tx)

---

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)

---

## 링크

- 저장소: [https://github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- 이메일: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)
