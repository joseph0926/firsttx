<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**CSR 앱의 재방문을 SSR처럼 느끼게**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> 재방문 시 마지막 상태를 즉시 복원하고, “오래된 → 최신” 전환을 명확하게 보여줍니다.
> **Instant Replay(렌더)** + **Local‑First(React 통합)** 기반이며, **Tx(원자적 롤백)** 은 계획/실험 단계입니다.

---

## FirstTx가 해결하는 문제

**CSR 앱의 만성 문제:**

```
❌ 재방문 때마다 빈 화면(2–3초 대기)
❌ 새로고침 시 작업 상태 손실
❌ 낙관 업데이트 실패 시 부분 롤백/불일치
```

**FirstTx의 접근(v3.1):**

```
✅ 스냅샷 기반 Instant Replay로 재방문 빈 화면 0ms
✅ 오프라인에서도 마지막 작업 상태 유지
✅ View Transition으로 “오래된 → 최신” 전환을 부드럽고 명시적으로 표시
```

> 안내: **원자적 롤백(Tx 레이어)** 은 현재 **계획/실험 단계**입니다.
> 지금은 낙관적 `patch` + 보상(롤백) 패턴을 권장하며, 전용 Tx API는 후속 제공됩니다.

---

## 핵심 아이디어 (3 레이어)

### 1) Instant Replay (렌더 레이어)

아주 작은 인라인 부트 스크립트가 로컬 스냅샷을 읽어 **메인 번들 도착 전** 실제 UI를 즉시 그립니다. 스냅샷이 없으면 **SSR‑Lite 쉘 또는 CSR 스켈레톤**으로 폴백합니다.

- 부트 스크립트 목표 크기: **< 2KB gzip**
- 서버 동기화 전까지 **“오래된 데이터” 배지**(예: “23h old data”) 표시
- 우선 하이드레이션: **prepaint된 DOM 재사용** 시도, 불일치 시 **View Transition**으로 교체

### 2) Local‑First (데이터 레이어)

IndexedDB 모델을 **`useSyncExternalStore + 메모리 캐시`** 로 React에 동기적으로 노출합니다.

- **`useModel(model)` → `[state, patch, history]`**
- `history.isStale`, `history.age` 로 UI 배지/힌트 제어
- **BroadcastChannel 기반 멀티탭 동기화는 Phase 1(계획)**

### 3) Tx (실행 레이어) — _계획/실험_

낙관 업데이트·라우팅·캐시 무효화를 **단일 트랜잭션**으로 묶고, **원자적 커밋/롤백**과 **저널(재시도/재적용)** 을 제공합니다.

- v3.1 안정 범주에는 미포함
- 초기 도입자는 실험 가능(변경 가능성 높음)

---

## 빠른 시작

### 설치

```bash
pnpm add @firsttx/prepaint @firsttx/local-first
# (선택, 실험적)
# pnpm add @firsttx/tx
```

### 1) Vite 플러그인 (Prepaint)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import prepaint from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

### 2) 모델 정의

```ts
// models/cart.ts
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

export const CartModel = defineModel('cart', {
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        price: z.number(),
        qty: z.number(),
      }),
    ),
    updatedAt: z.number().default(0),
  }),
  ttl: 5 * 60 * 1000, // 5분
  // (선택) 마이그레이션을 위한 버저닝
  // version: 1,
  // initialData: { items: [], updatedAt: 0 },
});
```

### 3) Prepaint 템플릿 (Instant Replay UI)

```tsx
// routes/cart.prepaint.tsx
'use prepaint';
import { prepaint } from '@firsttx/prepaint';

export default prepaint((ctx) => {
  const items = ctx.snap?.cart?.items ?? [];
  const ageHours = Math.floor((ctx.snapAge ?? 0) / 3600000);

  if (items.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className="cart">
      {ageHours > 0 && <span className="text-gray-500">{ageHours}h old data</span>}
      {items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
});
```

### 4) React에서 모델 사용 (v3.1)

```tsx
// routes/CartPage.tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { CartModel } from '../models/cart';

export default function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  // 메모리 캐시가 워밍업되는 동안 스켈레톤 표시
  if (!cart) return <CartSkeleton />;

  // 서버 동기화 → “오래된→최신” 부드러운 전환
  useEffect(() => {
    (async () => {
      const server = await api.getCart();
      if (!cart || server.updatedAt > cart.updatedAt) {
        const apply = () =>
          patch((draft) => {
            draft.items = server.items;
            draft.updatedAt = server.updatedAt;
          });
        if (document.startViewTransition) {
          document.startViewTransition(apply);
        } else {
          await apply();
        }
      }
    })();
  }, [cart, patch]);

  return (
    <div>
      {history.isStale && (
        <Badge variant="warning">{Math.floor(history.age / 3600000)}h old data</Badge>
      )}

      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

### 5) 앱 핸드오프

```ts
// main.tsx
import { handoff } from '@firsttx/prepaint';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const container = document.getElementById('root')!;
  if (strategy === 'hydrate-match') {
    hydrateRoot(container, <App />);
  } else {
    createRoot(container).render(<App />);
  }
});
```

---

## 지금 가능한 낙관 업데이트 (Tx 없이)

Tx 레이어가 안정화되기 전까지는 **낙관적 `patch` + 보상(롤백)** 패턴을 사용하세요.

```ts
async function addToCart(product) {
  // 낙관적 UI
  await CartModel.patch((draft) => {
    const existing = draft.items.find((x) => x.id === product.id);
    if (existing) existing.qty += 1;
    else draft.items.push({ ...product, qty: 1 });
    draft.updatedAt = Date.now();
  });

  try {
    await api.post('/cart/add', { id: product.id });
  } catch (e) {
    // 보상(롤백)
    await CartModel.patch((draft) => {
      const item = draft.items.find((x) => x.id === product.id);
      if (!item) return;
      item.qty -= 1;
      if (item.qty <= 0) {
        draft.items = draft.items.filter((x) => x.id !== product.id);
      }
      draft.updatedAt = Date.now();
    });
    toast.error('Add failed');
  }
}
```

> **실험적 Tx API**
> 원자적 트랜잭션을 조기에 시험해 보고 싶다면:
>
> ```bash
> pnpm add @firsttx/tx
> ```
>
> 안정화 전까지 API가 변경될 수 있습니다(깨지는 변경 포함).

---

## 성능 목표 (v3.1)

| 지표                      | 목표         | 비고                                  |
| ------------------------- | ------------ | ------------------------------------- |
| BlankScreenTime           | 0ms (재방문) | 부트에서 스냅샷 DOM 주입              |
| Prepaint Boot Size        | < 2KB gzip   | 인라인 부트 스크립트                  |
| Hydration Success         | > 95%        | 불일치 시 replace로 폴백              |
| React Sync Latency        | < 50ms       | subscribe → render (메모리 캐시 경유) |
| ViewTransition Smoothness | > 90% @60fps | 지원 브라우저에서(Chrome 111+)        |

---

## Feature Matrix

| 시나리오/기능            | 전통적 CSR | SSR/RSC | FirstTx (v3.1)           |
| ------------------------ | ---------- | ------- | ------------------------ |
| 첫 방문                  | 2–3s       | 즉시    | 2–3s (스켈레톤/SSR‑Lite) |
| 재방문                   | 2–3s       | 즉시    | 0ms (스냅샷)             |
| 오프라인에서 마지막 상태 | 아니요     | 아니요  | 예                       |
| 서버 필요                | 없음       | 높음    | 없음                     |
| 낙관 롤백                | 파편화     | 복잡함  | 실험적 / 계획됨          |

---

## 언제 사용하면 좋은가

**적합한 경우**

- 하루 수십 회 접속하는 B2B SaaS 대시보드
  → _2초 × 50회 ≈ 월 33분 절감_
- 내부 어드민/운영 툴(셀룰러/불안정 네트워크 환경)
- 오프라인 복원력이 필요한 현장 앱(건설/의료/물류 등)

**적합하지 않은 경우**

- SEO가 중요한 화면(랜딩/블로그) → SSR/RSC 권장
- 초저지연 트레이딩/스트리밍 → 특화 스택 권장
- 정적 콘텐츠 → SSG 권장

---

## 아키텍처 (개요)

```
┌─────────────────────────────────────┐
│ Instant Replay (렌더 레이어)        │
│ Boot → Snapshot → DOM               │
└─────────────────────────────────────┘
                 ↓ read
┌─────────────────────────────────────┐
│ Local‑First (데이터 레이어)          │
│ IndexedDB + 메모리 캐시(React)       │
│ (멀티탭 동기화: Phase 1 계획)        │
└─────────────────────────────────────┘
                 ↑ write
┌─────────────────────────────────────┐
│ Tx (실행 레이어)                     │
│ 낙관 → 원자 롤백(실험적)             │
└─────────────────────────────────────┘
```

**데이터 흐름**

1. **부트**: HTML → 부트 스크립트 → 스냅샷/저널 읽기 → DOM 페인트(빈 화면 0ms)
2. **핸드오프**: 메인 번들 → 하이드레이트(재사용) 또는 교체(View Transition)
3. **동기화**: 서버 데이터 도착 → 모델 patch → 구독자 업데이트 → 부드러운 전환
4. **인터랙션**: 낙관 patch; 원자 트랜잭션은 추후 Tx로 제공(계획)

---

## 라이선스

MIT

---

## 문의

- **Repository**: [github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- **Email**: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)

---

### 브라우저 지원 참고

- View Transitions는 **Chrome 111+** 필요(폴백 제공).
- `useSyncExternalStore`는 **React 18+** 필요.
