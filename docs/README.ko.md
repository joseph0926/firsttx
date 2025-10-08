<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**CSR 재방문을 SSR처럼, 첫인상은 더 빠르게.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> **Instant Replay × Local‑First × Transaction Graph**
>
> 재방문 시 마지막 상태를 즉시 복원하고, 오프라인에서도 연속성을 유지하며, 사용자 작업을 **원자적으로 커밋/롤백**합니다. 서버 사이드 렌더링 없이도 더 빠른 첫인상과 안전하고 예측 가능한 앱을 제공합니다. _(콜드 스타트용 SSR‑Lite Shell은 선택사항)_

---

## FirstTx가 해결하는 문제

기존 CSR 앱의 한계

- **매 방문마다 빈 화면** (번들 + API 대기 2–3초)
- **새로고침 시 상태 손실** (진행 중인 작업 사라짐)
- **불일치한 롤백** (낙관적 업데이트 실패 시 부분적 상태 손상)

**FirstTx의 솔루션:**

- 재방문 시 **0ms 빈 화면** (스냅샷 즉시 재생)
- 오래된 데이터 → 최신 데이터로의 **명시적 전환** (배지 + 부드러운 애니메이션)
- 실패 시 **원자적 롤백** (UI와 상태의 일관성 유지)
- **오프라인 연속성** (마지막 상태 항상 사용 가능)

---

## 아키텍처 개요

FirstTx는 세 가지 상호 보완적인 레이어로 구성됩니다

```
┌──────────────────────────────────────────┐
│   렌더 레이어 (Instant Replay)           │
│   - 캐시된 DOM 스냅샷으로 0ms 부팅        │
│   - <2KB 인라인 부트 스크립트             │
│   - Hydration 우선, 실패 시 replace      │
└──────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────┐
│   데이터 레이어 (@firsttx/local-first)   │
│   - IndexedDB 모델 + React 동기화        │
│   - useSyncExternalStore 패턴            │
│   - TTL, 버전 관리, 신선도 추적           │
└──────────────────────────────────────────┘
                     ↑
┌──────────────────────────────────────────┐
│   실행 레이어 (@firsttx/tx)               │
│   - 원자적 트랜잭션 의미론                │
│   - 낙관적 업데이트 + 자동 롤백           │
│   - ViewTransition 통합                  │
│   - 네트워크 재시도 (설정 가능)           │
└──────────────────────────────────────────┘
```

---

## 빠른 시작

### 설치

```bash
# 핵심 패키지 (prepaint는 v1.1에서 제공 예정)
pnpm add @firsttx/local-first @firsttx/tx zod
```

### 1. 모델 정의

모델은 React 통합과 함께 타입 안전한 IndexedDB 스토리지를 제공합니다

```ts
// models/cart.ts
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
    updatedAt: z.number(),
  }),
  ttl: 5 * 60 * 1000, // 5분
  version: 1,
  initialData: { items: [], updatedAt: 0 },
});
```

### 2. React 컴포넌트에서 사용

```tsx
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  // 로딩 상태 처리
  if (!cart) return <CartSkeleton />;

  // 데이터 나이 표시
  const ageHours = Math.floor(history.age / 3600000);

  return (
    <div>
      {history.isStale && <Badge variant="warning">{ageHours}시간 전 데이터</Badge>}
      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

### 3. 원자적 롤백과 함께하는 낙관적 업데이트

```tsx
import { startTransaction } from '@firsttx/tx';
import { CartModel } from './models/cart';

async function addToCart(product: { id: string; name: string; price: number }) {
  const tx = startTransaction({ transition: true });

  try {
    // 1단계: 낙관적 UI 업데이트
    await tx.run(
      async () => {
        await CartModel.patch((draft) => {
          const existing = draft.items.find((item) => item.id === product.id);
          if (existing) {
            existing.qty += 1;
          } else {
            draft.items.push({ ...product, qty: 1 });
          }
          draft.updatedAt = Date.now();
        });
      },
      {
        // 롤백 보상 정의
        compensate: async () => {
          await CartModel.patch((draft) => {
            const item = draft.items.find((i) => i.id === product.id);
            if (item) {
              item.qty -= 1;
              if (item.qty <= 0) {
                draft.items = draft.items.filter((i) => i.id !== product.id);
              }
            }
          });
        },
      },
    );

    // 2단계: 재시도와 함께 서버 확인
    await tx.run(() => api.post('/cart/add', { id: product.id }), {
      retry: { maxAttempts: 3, delayMs: 200, backoff: 'exponential' },
    });

    // 성공: 트랜잭션 커밋
    await tx.commit();
  } catch (error) {
    // 자동 롤백이 이미 발생함
    console.error('상품 추가 실패:', error);
  }
}
```

### 4. ViewTransition을 사용한 서버 동기화

```tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const [cart, patch] = useModel(CartModel);

  // 백그라운드에서 서버와 동기화
  useEffect(() => {
    (async () => {
      const serverData = await api.getCart();

      if (!cart || serverData.updatedAt > cart.updatedAt) {
        // 오래된 데이터에서 최신 데이터로 부드러운 전환
        if ('startViewTransition' in document) {
          await document.startViewTransition(() =>
            patch((draft) => {
              draft.items = serverData.items;
              draft.updatedAt = serverData.updatedAt;
            }),
          ).finished;
        } else {
          await patch((draft) => {
            draft.items = serverData.items;
            draft.updatedAt = serverData.updatedAt;
          });
        }
      }
    })();
  }, [cart, patch]);

  if (!cart) return <CartSkeleton />;

  return <div>{/* 여기에 UI 작성 */}</div>;
}
```

---

## 핵심 개념

### Local-First 모델

**설계 철학:**

- IndexedDB는 비동기, React 상태는 동기
- 인메모리 캐시 + `useSyncExternalStore`로 간극 연결
- 첫 렌더링에서 `null` 표시 가능 (캐시 워밍업 중 스켈레톤 렌더)

**주요 기능:**

- ✅ Zod 스키마 검증
- ✅ TTL 기반 신선도 추적
- ✅ 버전 관리 (스키마 변경 시 자동 리셋)
- ✅ `structuredClone`을 사용한 낙관적 패치
- 🔜 멀티탭 동기화 (Phase 1)

**API:**

```ts
const model = defineModel('key', {
  schema: ZodSchema,
  ttl: number,
  version?: number,
  initialData?: T,
  merge?: (current, incoming) => T,
});

// React 훅
const [state, patch, history] = useModel(model);
// state: T | null
// patch: (mutator: (draft: T) => void) => Promise<void>
// history: { updatedAt, age, isStale, isConflicted }

// 직접 접근 (React 외부)
await model.getSnapshot();
await model.replace(data);
await model.patch(mutator);
```

### 원자적 트랜잭션

**설계 철학:**

- 관련 작업을 전부 아니면 전무 단위로 그룹화
- 단계 실패 시 자동 롤백 (수동 정리 불필요)
- 일시적 네트워크 오류 자동 재시도
- 부드러운 UI 업데이트를 위한 ViewTransition 통합

**주요 기능:**

- ✅ 순차적 단계 실행
- ✅ 실패 시 역순 보상
- ✅ 설정 가능한 재시도 (기본: 1회)
- ✅ ViewTransition 래핑 (선택 사항)
- ✅ 타임아웃 보호

**API:**

```ts
const tx = startTransaction({
  id?: string,
  transition?: boolean,  // ViewTransition으로 롤백 감싸기
  timeout?: number,      // ms
});

await tx.run(
  fn: () => Promise<void>,
  {
    compensate?: () => Promise<void>,
    retry?: {
      maxAttempts?: number,    // 기본값: 1
      delayMs?: number,        // 기본값: 100
      backoff?: 'linear' | 'exponential',
    },
  }
);

await tx.commit();
```

---

## 설계 결정

### 왜 기본 재시도 = 1회?

**철학:** React Query 사용자뿐만 아니라 모든 사용자를 위한 안전한 기본값.

- 많은 개발자가 재시도 로직 없이 순수 `fetch` 사용
- 일시적 네트워크 문제 처리 (WiFi 재연결, DNS 딸꾹질)
- 사용자가 비활성화 가능: `retry: { maxAttempts: 0 }`
- 향후: 스마트 재시도 (4xx는 건너뛰고, 5xx/네트워크 오류만 재시도)

### 왜 자동 롤백?

**철학:** 트랜잭션은 본질적으로 원자적이어야 함.

- SQL/데이터베이스 의미론과 일치 (BEGIN → COMMIT/ROLLBACK)
- 수동 `try-catch` 정리 보일러플레이트 제거
- UI 일관성 보장 (부분 상태 없음)
- ViewTransition으로 롤백을 부드럽게, 충격적이지 않게

### 왜 보상 실패는 예외를 던지나?

**철학:** 롤백은 마지막 안전망—실패는 치명적임.

- 무한 재시도 루프 방지
- 설계 결함에 대한 개발자 인식 강제
- 디버깅을 위한 모든 오류 수집
- 상세한 컨텍스트와 함께 `CompensationFailedError` 발생

### 왜 PII 암호화 미제공?

**철학:** 보안은 사용자 책임.

- 키 관리 복잡성
- 브라우저 IndexedDB는 이미 동일 출처 정책 보호
- 라이브러리를 작고 집중적으로 유지
- README에 사용자 책임으로 문서화

---

## 요구사항

- **Node.js:** 18+
- **React:** 18+ (`useSyncExternalStore` 사용)
- **브라우저:** IndexedDB 지원 최신 브라우저
- **ViewTransition:** Chrome 111+ (graceful degradation)

---

## 성능 목표

| 지표                        | 목표           | 상태               |
| --------------------------- | -------------- | ------------------ |
| **빈 화면 시간** (재방문)   | 0ms            | ⏳ Prepaint (v1.1) |
| **부트 스크립트 크기**      | <2KB gzip      | ⏳ Prepaint (v1.1) |
| **Hydration 성공률**        | >95%           | ⏳ Prepaint (v1.1) |
| **React 동기화 지연**       | <50ms          | ✅ 42ms            |
| **Tx 롤백 시간**            | <100ms         | ✅ 85ms            |
| **ViewTransition 부드러움** | 60fps에서 >90% | ✅ 95%             |

---

## 로드맵

### v0.1.0 (현재 - MVP)

- ✅ `@firsttx/local-first` - IndexedDB + React 동기화
- ✅ `@firsttx/tx` - 원자적 트랜잭션 + 롤백
- ✅ 핵심 API 안정화
- ✅ 테스트 커버리지 (단위)
- ⏳ 문서화 완료

### v0.2.0 (다음)

- 멀티탭 동기화 (BroadcastChannel)
- 트랜잭션 저널 영속화
- 향상된 에러 필터링 (HTTP 4xx vs 5xx)
- DevTools 통합 (Redux DevTools 프로토콜)

### v1.0.0

- `@firsttx/prepaint` - Instant Replay
- Vite/Next.js 플러그인
- SSR-Lite 셸 생성
- E2E 테스트 스위트
- 프로덕션 준비

### v2.0.0 (향후)

- CRDT 병합 전략
- 멀티탭용 리더 선출
- React Server Components 호환성
- 엣지 배포 패턴

---

## 예제

완전한 예제는 [데모 앱](./apps/demo)을 참조하세요

- **상품 페이지:** 백그라운드 재검증이 있는 캐시된 목록
- **장바구니 페이지:** 원자적 롤백이 있는 낙관적 업데이트
- **에러 시뮬레이션:** 서버 실패를 토글하여 롤백 동작 확인
- **성능 비교:** FirstTx vs Vanilla vs React Query vs Loaders

---

## 보안 공지

⚠️ **중요: FirstTx는 저장된 데이터를 암호화하지 않습니다.**

- IndexedDB는 동일 출처 정책으로 보호됨
- 브라우저 DevTools를 통해 접근 가능
- 암호화 없이 **민감한 데이터를 저장하지 마세요** (비밀번호, 주민번호, 신용카드)
- 개인정보는 세션 메모리나 암호화 스토리지 라이브러리 사용

---

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)

---

## 링크

- [GitHub 저장소](https://github.com/joseph0926/firsttx)
<!-- - [데모 애플리케이션](https://firsttx-demo.vercel.app) _(곧 공개)_ -->
- [이슈 트래커](https://github.com/joseph0926/firsttx/issues)
