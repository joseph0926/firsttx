<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**CSR 앱의 재방문 경험을 SSR 수준으로 만드는 통합 시스템**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)

> 사용자가 두 번째 방문할 때부터, 마지막 상태를 즉시 복원하고 낙관적 업데이트를 안전하게 롤백하여 서버 없이도 빠르고 일관된 경험을 제공합니다.

---

## 📋 목차

- [핵심 가치](#-핵심-가치)
- [빠른 시작](#-빠른-시작)
- [아키텍처](#-아키텍처)
- [패키지 구성](#-패키지-구성)
- [주요 기능](#-주요-기능)
- [성능 목표](#-성능-목표)
- [로드맵](#-로드맵)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## 🎯 핵심 가치

### 문제: CSR의 재방문 경험

```
매 방문마다 빈 화면 → API 대기 → 데이터 표시
새로고침하면 진행 상태 손실
낙관 업데이트 실패 시 일부만 롤백되는 불일치
```

### 해결: FirstTx = Prepaint + Local-First + Tx

```
[재방문 시나리오]
1. /cart 재접속 → 어제 담은 상품 3개 즉시 표시 (0ms)
2. 메인 앱 로드 → React hydration → 스냅샷 DOM 재사용
3. 서버 동기화 → ViewTransition으로 부드럽게 업데이트 (3개 → 5개)
4. "+1" 클릭 → Tx 시작 → 낙관 패치 → 서버 에러 발생
5. 자동 롤백 → ViewTransition으로 원래 상태로 부드럽게 복귀
```

**결과:**

- ⚡ 재방문 시 빈 화면 시간 = 0ms
- 🎨 스냅샷→최신 데이터 전환의 부드러운 애니메이션
- 🔄 낙관 업데이트 실패 시 일관된 원자적 롤백
- 📴 오프라인에서도 마지막 상태 유지

---

## 🚀 빠른 시작

### 설치

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

### 기본 사용 (Zero-Config)

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

#### 3. React 컴포넌트

```tsx
// pages/cart-page.tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from '@/models/cart-model';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <Skeleton />;

  return (
    <div>
      <p>마지막 업데이트: {new Date(history.updatedAt).toLocaleString()}</p>
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
      // 롤백 시 실행될 보상 함수
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

## 🏗️ 아키텍처

### 세 레이어 시스템

```
┌──────────────────────────────────────────┐
│   Render 계층 (Prepaint)                 │
│   - Instant Replay (0ms 복원)            │
│   - beforeunload 캡처                    │
│   - React 위임 hydration                 │
└──────────────────────────────────────────┘
                     ↓ 읽기
┌──────────────────────────────────────────┐
│   Local-First (데이터 계층)              │
│   - IndexedDB 스냅샷/모델 관리           │
│   - React 통합 (useSyncExternalStore)    │
│   - 메모리 캐시 패턴                     │
└──────────────────────────────────────────┘
                     ↑ 쓰기
┌──────────────────────────────────────────┐
│   Tx (실행 계층)                          │
│   - 낙관 업데이트                         │
│   - 원자적 롤백                           │
│   - ViewTransition 통합                  │
└──────────────────────────────────────────┘
```

### 데이터 흐름

```
[부트 - 0ms]
HTML 로드 → Prepaint 부트 실행 → IndexedDB 스냅샷 읽기 → DOM 즉시 주입

[핸드오프 - 500ms]
메인 앱 로드 → createFirstTxRoot() → React hydration → DOM 재사용

[동기화 - 800ms]
서버 동기화 → ViewTransition 래핑 → 부드러운 업데이트

[인터랙션]
사용자 액션 → Tx 시작 → 낙관 패치 → 서버 요청 → 성공/실패 → 커밋/롤백
```

---

## 📦 패키지 구성

### [`@firsttx/prepaint`](./packages/prepaint)

**Render 계층 - Instant Replay 시스템**

- `boot()` - 부트 스크립트 (IndexedDB → DOM 주입)
- `createFirstTxRoot()` - React 통합 헬퍼
- `handoff()` - 전략 판단 (has-prepaint | cold-start)
- `setupCapture()` - beforeunload 캡처

### [`@firsttx/local-first`](./packages/local-first)

**데이터 계층 - IndexedDB + React 통합**

- `defineModel()` - 모델 정의 (schema, TTL, 버전)
- `useModel()` - React 훅 (useSyncExternalStore 기반)
- 메모리 캐시 패턴 (동기/비동기 브릿지)
- TTL/버전/히스토리 관리

### [`@firsttx/tx`](./packages/tx)

**실행 계층 - 낙관 업데이트 + 원자적 롤백**

- `startTransaction()` - 트랜잭션 시작
- `tx.run()` - 단계 추가 (compensate 지원)
- `tx.commit()` - 커밋
- 자동 롤백 (실패 시)
- 재시도 로직 (기본 1회)
- ViewTransition 통합

---

## ✨ 주요 기능

### 1. Instant Replay (0ms 복원)

**재방문 시 마지막 상태를 즉시 복원**

```tsx
// 메인 번들 도착 전에 실행 (부트 스크립트)
import { boot } from '@firsttx/prepaint';
boot(); // IndexedDB → DOM 즉시 주입 (0ms)
```

### 2. 메모리 캐시 패턴

**IndexedDB(비동기) ↔ React(동기) 브릿지**

```tsx
// Model 내부
let cache: T | null = null
const subscribers = new Set<() => void>()

// 첫 구독 시 IndexedDB 로드
subscribe(callback) → cache 업데이트 → notifySubscribers()

// React는 동기로 읽기
getCachedSnapshot() → cache (동기!)
```

### 3. 원자적 롤백

**전부 성공 또는 전부 실패 (ViewTransition 포함)**

```tsx
const tx = startTransaction({ transition: true })

await tx.run(() => CartModel.patch(...), {
  compensate: () => CartModel.patch(...) // 롤백 시 실행
})

await tx.run(() => api.post(...))

await tx.commit() // 실패 시 자동 롤백 (ViewTransition으로 감싸기)
```

### 4. React 위임 Hydration

**Prepaint DOM과 React VDOM 불일치 처리**

```tsx
// 80% 케이스: React가 DOM 재사용
// 20% 케이스: React가 자동 patch
// ViewTransition으로 부드럽게 전환
```

---

## 📊 성능 목표

| 지표                      | 목표         | 현재 상태  |
| ------------------------- | ------------ | ---------- |
| **BlankScreenTime (BST)** | 0ms (재방문) | ⏳ 구현 중 |
| **PrepaintTime (PPT)**    | <20ms        | ⏳ 구현 중 |
| **HydrationSuccess**      | >80%         | ⏳ 구현 중 |
| **ViewTransitionSmooth**  | >90%         | ✅ 95%     |
| **BootScriptSize**        | <2KB gzip    | ⏳ 목표치  |
| **ReactSyncLatency**      | <50ms        | ✅ 42ms    |
| **TxRollbackTime**        | <100ms       | ✅ 85ms    |

---

## 🗺️ 로드맵

### v0.1.0 (MVP - 현재)

**완료:**

- ✅ Local-First (IndexedDB + React 통합)
- ✅ Tx (낙관 업데이트 + 원자적 롤백)

**진행 중:**

- ⏳ Prepaint (Instant Replay)
  - ✅ handoff, capture, createFirstTxRoot
  - ⏳ boot 스크립트
  - ⏳ Vite 플러그인

### v0.2.0 (Phase 1)

- BroadcastChannel 멀티탭 동기화
- visibilitychange 캡처
- 라우터 통합 (React Router, TanStack Router)
- Tx 저널 영속화

### v1.0.0 (Production Ready)

- Vite/Next.js 플러그인 완성
- E2E 테스트 완비
- DevTools 통합
- 성능 최적화
- 문서화 완성

---

## 🎨 데모

[Live Demo →](https://firsttx-demo.vercel.app/)

**주요 데모 시나리오**

1. **일주일 후 재방문** - TTL 시각화
2. **오프라인 쇼핑** - 네트워크 단절 시뮬레이션
3. **낙관적 업데이트 실패** - 롤백 애니메이션
4. **동시 다발적 액션** - 트랜잭션 일관성

---

## 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/joseph0926/firsttx.git
cd firsttx

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 테스트 실행
pnpm test
```

---

## 📄 라이선스

MIT © [joseph0926](https://github.com/joseph0926)

---

## 🔗 링크

- 개발자 이메일: joseph0926.dev@gmail.com
- [GitHub Issues](https://github.com/joseph0926/firsttx/issues)

---

## 💬 FAQ

<details>
<summary><strong>Q: SSR/RSC와 어떻게 다른가요?</strong></summary>

**A:** FirstTx는 CSR 앱을 위한 솔루션입니다.

| 솔루션      | 첫 방문 | 재방문  | 서버 필요 |
| ----------- | ------- | ------- | --------- |
| SSR/RSC     | ⚡ 빠름 | ⚡ 빠름 | ✅ 필수   |
| CSR (기존)  | 🐌 느림 | 🐌 느림 | ❌ 불필요 |
| **FirstTx** | 🐌 보통 | ⚡ 빠름 | ❌ 불필요 |

FirstTx는 서버 인프라 없이도 재방문 경험을 SSR 수준으로 만듭니다.

</details>

<details>
<summary><strong>Q: React Query/SWR와 함께 사용할 수 있나요?</strong></summary>

**A:** 네! FirstTx는 기존 데이터 페칭 라이브러리와 함께 사용할 수 있습니다.

- **Local-First**: 영속 저장소 (IndexedDB)
- **React Query**: 네트워크 캐시 + 재시도
- **Tx**: 낙관 업데이트 롤백

각 레이어는 독립적으로 동작하며, 필요한 부분만 선택적으로 사용 가능합니다.

</details>

<details>
<summary><strong>Q: 브라우저 호환성은?</strong></summary>

**A:**

- **IndexedDB**: IE11+ (모든 모던 브라우저)
- **ViewTransition**: Chrome 111+ (폴백 제공)
- **useSyncExternalStore**: React 18+

ViewTransition 미지원 브라우저에서는 일반 리렌더로 폴백됩니다.

</details>

<details>
<summary><strong>Q: 민감한 데이터(PII)를 저장해도 되나요?</strong></summary>

**A:** FirstTx는 암호화를 제공하지 않습니다.

- IndexedDB는 동일 출처 정책으로 보호됨
- 민감 데이터는 사용자가 암호화 후 저장 권장
- 또는 메모리 전용 모델 사용 (ttl: 0)

</details>
