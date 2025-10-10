<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**CSR 앱의 재방문 경험을 SSR 수준으로**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)

> 두 번째 방문부터 마지막 상태를 즉시 복원하고, 낙관적 업데이트 실패 시 안전하게 롤백하여 서버 없이도 빠르고 일관된 경험을 제공합니다.

---

## 목차

- [핵심 가치](#핵심-가치)
- [빠른 시작](#빠른-시작)
- [아키텍처](#아키텍처)
- [패키지](#패키지)
- [주요 기능](#주요-기능)
- [성능 목표](#성능-목표)
- [로드맵](#로드맵)
- [라이선스](#라이선스)

---

## 핵심 가치

### 문제: CSR 재방문 경험

```
매번 방문: 빈 화면 → API 대기 → 데이터 표시
새로고침 시 진행 상태 손실
낙관적 업데이트 실패 시 부분 롤백으로 인한 불일치
컴포넌트를 어지럽히는 서버 동기화 보일러플레이트
```

### 해결책: FirstTx = Prepaint + Local-First + Tx

```
[재방문 시나리오]
1. /cart 재접속 → 어제 담은 상품 3개 즉시 표시 (0ms)
2. 메인 앱 로드 → React hydration → 스냅샷 DOM 재사용
3. 서버 동기화 → ViewTransition으로 부드럽게 업데이트 (3개 → 5개)
4. "+1" 클릭 → Tx 시작 → 낙관 패치 → 서버 에러
5. 자동 롤백 → ViewTransition으로 원래 상태로 부드럽게 복귀
```

**결과:**

- 재방문 시 빈 화면 시간 = 0ms
- 스냅샷→최신 데이터 전환의 부드러운 애니메이션
- 낙관적 업데이트 실패 시 일관된 원자적 롤백
- 서버 동기화 보일러플레이트 90% 감소
- 오프라인에서도 마지막 상태 유지

---

## 빠른 시작

### 설치

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### 기본 사용법

#### 1. 모델 정의

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

#### 2. 메인 앱 진입점

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';
import App from './App';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

#### 3. React 컴포넌트 (서버 동기화)

```tsx
// pages/cart-page.tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from '@/models/cart-model';

async function fetchCart(current) {
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
    autoSync: true, // stale 상태일 때 자동 동기화
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

#### 4. 낙관적 업데이트 (Tx)

```tsx
// actions/add-to-cart.ts
import { startTransaction } from '@firsttx/tx';
import { CartModel } from '@/models/cart-model';

async function addItem(product: Product) {
  const tx = startTransaction({ transition: true });

  // Step 1: 낙관적 패치
  await tx.run(
    () =>
      CartModel.patch((draft) => {
        draft.items.push({ ...product, qty: 1 });
      }),
    {
      // 롤백 시 실행되는 보상 함수
      compensate: () =>
        CartModel.patch((draft) => {
          draft.items.pop();
        }),
    },
  );

  // Step 2: 서버 요청
  await tx.run(() => api.post('/cart/add', { id: product.id }));

  // 커밋 (성공 시) 또는 자동 롤백 (실패 시)
  await tx.commit();
}
```

---

## 아키텍처

### 3계층 시스템

```
┌──────────────────────────────────────────┐
│   렌더 계층 (Prepaint)                    │
│   - Instant Replay (0ms 복원)            │
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
[부트 - 0ms]
HTML 로드 → Prepaint 부트 → IndexedDB 스냅샷 읽기 → DOM 즉시 주입

[핸드오프 - 500ms]
메인 앱 로드 → createFirstTxRoot() → React hydration → DOM 재사용

[동기화 - 800ms]
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

**주요 기능:**

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

**주요 기능:**

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

**주요 기능:**

- 전부 성공 또는 전부 실패 실행 의미론
- 실패 시 자동 보상
- 내장 네트워크 재시도 로직

---

## 주요 기능

### 1. Instant Replay (0ms 복원)

재방문 시 마지막 상태 즉시 복원

```tsx
// 메인 번들 도착 전에 실행 (부트 스크립트)
import { boot } from '@firsttx/prepaint';
boot(); // IndexedDB → 즉시 DOM 주입 (0ms)
```

### 2. 보일러플레이트 제로 서버 동기화

복잡함 없이 React Query 수준의 개발자 경험

```tsx
// 전통적 방식 (장황함)
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

// FirstTx 방식 (간결함)
const { data, isSyncing, error } = useSyncedModel(DataModel, fetchData, { autoSync: true });
```

### 3. 원자적 롤백

전부 성공 또는 전부 실패 (ViewTransition과 함께)

```tsx
const tx = startTransaction({ transition: true });

await tx.run(() => CartModel.patch(...), {
  compensate: () => CartModel.patch(...) // 롤백 시 실행
});

await tx.run(() => api.post(...));

await tx.commit(); // 실패 시 자동 롤백
```

### 4. 메모리 캐시 패턴

IndexedDB (비동기) ↔ React (동기) 브릿지

```tsx
// Model 내부
let cache: T | null = null;
const subscribers = new Set<() => void>();

// 첫 구독 시 IndexedDB 로드
subscribe(callback) → cache 업데이트 → notifySubscribers()

// React는 동기적으로 읽기
getCachedSnapshot() → cache (동기!)
```

---

## 성능 목표

| 지표                         | 목표         | 현재 상태 |
| ---------------------------- | ------------ | --------- |
| **BlankScreenTime (BST)**    | 0ms (재방문) | 진행 중   |
| **PrepaintTime (PPT)**       | <20ms        | 진행 중   |
| **HydrationSuccess**         | >80%         | 진행 중   |
| **ViewTransitionSmooth**     | >90%         | 95%       |
| **BootScriptSize**           | <2KB gzip    | 목표치    |
| **ReactSyncLatency**         | <50ms        | 42ms      |
| **TxRollbackTime**           | <100ms       | 85ms      |
| **SyncBoilerplateReduction** | >90%         | 90%       |

---

## 예제

[playground](./apps/playground)에서 실제 시나리오를 탐색하세요:

- **Prepaint**: 무거운 페이지 즉시 재생, 라우트 전환
- **Sync**: 충돌 해결, 타이밍 공격, stale 감지
- **Tx**: 동시 업데이트, 롤백 체인, 네트워크 혼란

---

## 브라우저 호환성

- **IndexedDB**: 모든 최신 브라우저 (IE11+)
- **ViewTransition**: Chrome 111+, Edge 111+ (우아한 폴백)
- **useSyncExternalStore**: React 18+

ViewTransition을 지원하지 않는 브라우저는 애니메이션 없이 일반 리렌더로 폴백됩니다.

---

## FAQ

**Q: SSR/RSC와 어떻게 다른가요?**

FirstTx는 SSR이 불가능하거나 원하지 않는 CSR 앱(관리자 패널, 대시보드, 내부 도구)을 위한 솔루션입니다.

| 솔루션       | 첫 방문 | 재방문 | 서버 필요 |
| ------------ | ------- | ------ | --------- |
| SSR/RSC      | 빠름    | 빠름   | 필수      |
| CSR (전통적) | 느림    | 느림   | 선택      |
| **FirstTx**  | 보통    | 빠름   | 선택      |

**Q: React Query/SWR과 함께 사용할 수 있나요?**

네! FirstTx는 기존 데이터 페칭 라이브러리와 함께 작동합니다:

- **Local-First**: 영속 스토리지 (IndexedDB)
- **React Query**: 네트워크 캐시 + 재시도
- **Tx**: 낙관적 업데이트 롤백

**Q: 민감한 데이터 저장이 안전한가요?**

FirstTx는 암호화를 제공하지 않습니다. IndexedDB는 동일 출처 정책으로 보호되지만, 민감한 데이터는 저장 전에 암호화해야 합니다.

---

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)

---

## 링크

- [GitHub 저장소](https://github.com/joseph0926/firsttx)
- [GitHub Issues](https://github.com/joseph0926/firsttx/issues)
- 개발자 이메일: joseph0926.dev@gmail.com
