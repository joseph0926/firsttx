<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**CSR 앱의 재방문 경험을 SSR 수준으로**

> 두 번째 방문부터 마지막 상태를 즉시 복원하고 낙관적 업데이트를 안전하게 롤백하여, 서버 인프라 없이도 빠르고 일관된 경험을 제공합니다.

---

## 목차

- [핵심 가치](#핵심-가치)
- [빠른 시작](#빠른-시작)
- [아키텍처](#아키텍처)
- [패키지](#패키지)
- [주요 기능](#주요-기능)
- [성능 목표](#성능-목표)
- [설계 철학](#설계-철학)
- [브라우저 지원](#브라우저-지원)
- [예제](#예제)
- [라이선스](#라이선스)

---

## 핵심 가치

### 문제: CSR 재방문 경험

```
매 방문마다: 빈 화면 → API 대기 → 데이터 표시
새로고침 시 진행 상태 손실
낙관적 업데이트 실패 시 일부만 롤백되는 불일치
서버 동기화 보일러플레이트로 복잡해지는 컴포넌트
```

### 솔루션: FirstTx = Prepaint + Local-First + Tx

```
[재방문 시나리오]
1. /cart 재방문 → 어제 담은 상품 3개 즉시 표시 (~0ms)
2. 메인 앱 로드 → React hydration → 스냅샷 DOM 재사용
3. 서버 동기화 → ViewTransition으로 부드러운 업데이트 (3개 → 5개)
4. "+1" 클릭 → Tx 시작 → 낙관 패치 → 서버 에러
5. 자동 롤백 → ViewTransition으로 부드럽게 원래 상태로 복귀
```

**결과**

- 재방문 시 빈 화면 시간 ≈ 0ms
- 스냅샷에서 최신 데이터로 전환 시 부드러운 애니메이션
- 낙관적 업데이트 실패 시 일관된 원자적 롤백
- 서버 동기화 보일러플레이트 90% 감소
- 오프라인에서도 마지막 상태 유지

---

## 빠른 시작

### 설치

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### 기본 설정

#### 1. Vite 플러그인 설정

```tsx
// vite.config.ts
import { defineConfig } from 'vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx(), // Instant Replay를 위한 부트 스크립트 자동 주입
  ],
});
```

#### 2. 모델 정의

```tsx
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

#### 3. 메인 앱 진입점

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

#### 4. React 컴포넌트 (기본 - 로컬만)

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

#### 5. React 컴포넌트 (서버 동기화)

```tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart-model';

async function fetchCart() {
  const response = await fetch('/api/cart');
  return response.json();
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
    autoSync: true, // 데이터가 TTL을 초과하면 자동 동기화
    onSuccess: (data) => console.log('동기화 완료:', data),
    onError: (err) => toast.error(err.message),
  });

  if (!cart) return <Skeleton />;
  if (error) return <ErrorBanner error={error} onRetry={sync} />;

  return (
    <div>
      {isSyncing && <SyncIndicator />}
      {history.isStale && <Badge>업데이트 중...</Badge>}
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

**autoSync 전략**

| 전략                       | 사용 시기                      | 사용 예시                 |
| -------------------------- | ------------------------------ | ------------------------- |
| `autoSync: true`           | 데이터가 항상 최신이어야 할 때 | 주식 가격, 알림, 대시보드 |
| `autoSync: false` (기본값) | 사용자가 새로고침을 제어할 때  | 장바구니, 초안 편집기, 폼 |

```tsx
// 수동 동기화 예시 (autoSync: false)
const { data, sync, isSyncing } = useSyncedModel(Model, fetcher);

<button onClick={sync} disabled={isSyncing}>
  {isSyncing ? '동기화 중...' : '새로고침'}
</button>;
```

#### 6. Tx로 낙관적 업데이트

```tsx
import { startTransaction } from '@firsttx/tx';
import { CartModel } from './models/cart-model';

async function addItem(product) {
  const tx = startTransaction({ transition: true });

  // Step 1: 낙관적 로컬 업데이트
  await tx.run(
    () =>
      CartModel.patch((draft) => {
        draft.items.push({ ...product, qty: 1 });
      }),
    {
      compensate: () =>
        CartModel.patch((draft) => {
          draft.items.pop();
        }),
    },
  );

  // Step 2: 서버 확인
  await tx.run(() => api.post('/cart/add', { id: product.id }));

  // 커밋 (실패 시 자동 롤백)
  await tx.commit();
}
```

---

## 아키텍처

### 3계층 시스템

```
┌──────────────────────────────────────────┐
│   렌더 계층 (Prepaint)                    │
│   - Instant Replay                       │
│   - beforeunload 캡처                    │
│   - React 위임 hydration                 │
└──────────────────────────────────────────┘
                     ↓ 읽기
┌──────────────────────────────────────────┐
│   Local-First (데이터 계층)               │
│   - IndexedDB 스냅샷/모델 관리            │
│   - React 통합 (useSyncExtStore)         │
│   - 메모리 캐시 패턴                      │
│   - useSyncedModel (서버 동기화)         │
└──────────────────────────────────────────┘
                     ↑ 쓰기
┌──────────────────────────────────────────┐
│   Tx (실행 계층)                          │
│   - 낙관적 업데이트                       │
│   - 원자적 롤백                           │
│   - ViewTransition 통합                  │
└──────────────────────────────────────────┘
```

### 데이터 흐름

```
[부트 - ~0ms]
HTML 로드 → Prepaint 부트 스크립트 → IndexedDB 스냅샷 읽기 → DOM 즉시 주입

[핸드오프 - ~500ms]
메인 앱 로드 → createFirstTxRoot() → React hydration → DOM 재사용

[동기화 - ~800ms]
useSyncedModel 훅 → autoSync가 stale 감지 → fetcher() 호출
→ ViewTransition 래핑 → 부드러운 업데이트

[인터랙션]
사용자 액션 → Tx 시작 → 낙관 패치 → 서버 요청
→ 성공: commit / 실패: ViewTransition과 함께 자동 rollback
```

---

## 패키지

### [`@firsttx/prepaint`](./packages/prepaint)

**렌더 계층 - Instant Replay 시스템**

- `boot()` - 부트 스크립트 (IndexedDB → DOM 주입)
- `createFirstTxRoot()` - React 통합 헬퍼
- `handoff()` - 전략 결정 (has-prepaint | cold-start)
- `setupCapture()` - beforeunload 캡처

**주요 기능**

- 재방문 시 빈 화면 시간 제로
- 페이지 언로드 시 자동 캡처
- ViewTransition 지원과 함께하는 React hydration

### [`@firsttx/local-first`](./packages/local-first)

**데이터 계층 - IndexedDB + React 통합**

- `defineModel()` - 모델 정의 (schema, TTL, version)
- `useModel()` - React 훅 (useSyncExternalStore 기반)
- `useSyncedModel()` - autoSync 지원하는 서버 동기화 훅
- 메모리 캐시 패턴 (동기/비동기 브릿지)
- TTL/버전/히스토리 관리

**주요 기능**

- 메모리 캐시를 통한 동기식 React 통합
- 자동 stale 감지
- 서버 동기화 보일러플레이트 90% 감소

### [`@firsttx/tx`](./packages/tx)

**실행 계층 - 낙관적 업데이트 + 원자적 롤백**

- `startTransaction()` - 트랜잭션 시작
- `tx.run()` - 스텝 추가 (compensate 지원)
- `tx.commit()` - 커밋
- 자동 롤백 (실패 시)
- 재시도 로직 (기본 1회)
- ViewTransition 통합

**주요 기능**

- 전부 성공 또는 전부 실패 실행 의미론
- 실패 시 자동 보상
- 내장 네트워크 재시도 로직

---

## 주요 기능

### 1. Instant Replay (~0ms 복원)

자동 주입된 부트 스크립트로 재방문 시 마지막 상태를 즉시 복원

```tsx
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx()], // 부트 스크립트 자동 주입
});
```

플러그인이 메인 번들보다 먼저 실행되는 작은 부트 스크립트(<2KB)를 자동으로 주입하여, IndexedDB에서 마지막으로 캡처된 상태를 즉시 복원합니다.

### 2. 간편한 서버 동기화

`useSyncedModel`로 보일러플레이트 제거

```tsx
// Before: 수동 상태 관리 (15줄 이상)
const [data, setData] = useState(null);
const [isSyncing, setIsSyncing] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setIsSyncing(true);
  fetch('/api/data')
    .then((res) => res.json())
    .then(setData)
    .catch(setError)
    .finally(() => setIsSyncing(false));
}, []);

// After: 한 줄의 훅 (1줄)
const { data, isSyncing, error, sync } = useSyncedModel(DataModel, fetchData, {
  autoSync: true,
});
```

### 3. 원자적 트랜잭션

자동 롤백이 포함된 전부 성공 또는 전부 실패 업데이트

```tsx
const tx = startTransaction({ transition: true });

// Step 1: 로컬 업데이트 (롤백 핸들러 포함)
await tx.run(() => updateLocal(), {
  compensate: () => revertLocal(),
});

// Step 2: 서버 업데이트 (재시도 포함)
await tx.run(() => updateServer());

// 실패 시 자동 롤백
await tx.commit();
```

### 4. 부드러운 전환

부드러운 시각적 업데이트를 위한 내장 ViewTransition API 통합

```tsx
// hydration 시 자동 부드러운 애니메이션
createFirstTxRoot(root, <App />, { transition: true });

// 에러 시 부드러운 롤백 애니메이션
const tx = startTransaction({ transition: true });
```

---

## 성능 목표

| 지표                         | 목표   | 상태      |
| ---------------------------- | ------ | --------- |
| **BlankScreenTime (BST)**    | ~0ms   | ✅ ~0ms   |
| **PrepaintTime (PPT)**       | <20ms  | ✅ 15ms   |
| **HydrationSuccess**         | >80%   | ✅ 82%    |
| **ViewTransitionSmooth**     | >90%   | ✅ 95%    |
| **BootScriptSize**           | <2KB   | ✅ 1.74KB |
| **ReactSyncLatency**         | <50ms  | ✅ 42ms   |
| **TxRollbackTime**           | <100ms | ✅ 85ms   |
| **SyncBoilerplateReduction** | >90%   | ✅ 90%    |

---

## 설계 철학

### FirstTx를 사용해야 하는 경우

**✅ 적합한 경우**

- 내부 도구 (CRM, 어드민 패널, 대시보드)
- 재방문이 빈번한 앱 (하루 10회 이상)
- SEO가 필요 없는 경우 (로그인 필요 앱)
- 복잡한 클라이언트 측 인터랙션
- 최소한의 서버 인프라 선호

**❌ 적합하지 않은 경우**

- 공개 마케팅 사이트 (SSR/SSG 사용)
- 첫 방문 성능이 중요한 앱
- 항상 최신 데이터가 필요한 앱
- 복잡한 인터랙션이 없는 단순 CRUD 앱

### 트레이드오프

| 측면          | FirstTx          | SSR/RSC   |
| ------------- | ---------------- | --------- |
| 첫 방문       | 일반 CSR (느림)  | 빠름      |
| 재방문        | ~0ms (즉시)      | 빠름      |
| 데이터 신선도 | 스냅샷 → 동기화  | 항상 최신 |
| 서버 복잡도   | 최소 (API만)     | 필수      |
| SEO           | 미지원           | 완전 지원 |
| 오프라인 지원 | 마지막 상태 유지 | 미지원    |

---

## 브라우저 지원

- **Chrome/Edge**: 111+ (ViewTransition 완전 지원)
- **Firefox/Safari**: 최신 버전 (graceful degradation, ViewTransition 없음)
- **Mobile**: iOS Safari 16+, Chrome Android 111+

**참고** 핵심 기능은 모든 브라우저에서 작동합니다. ViewTransition은 점진적 향상입니다.

---

## 예제

- [`apps/demo`](./apps/demo) - 간단한 장바구니 데모
- [`apps/playground`](./apps/playground) - 인터랙티브 시나리오

---

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)

---

## 링크

- [GitHub 저장소](https://github.com/joseph0926/firsttx)
- Email: joseph0926.dev@gmail.com
