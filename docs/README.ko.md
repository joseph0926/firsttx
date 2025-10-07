<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**CSR 앱의 재방문을 SSR처럼, 첫인상은 더 빠르게**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> **Instant Replay × Local‑First × Transaction Graph**
> 재방문 시 마지막 상태를 즉시 복원하고, 오프라인에서도 연속성을 유지하며, 사용자 작업을 **원자적으로 커밋/롤백**합니다.
> 서버 사이드 렌더링 없이도 일관되고 예측 가능한 CSR 경험을 제공합니다. _(콜드 스타트용 SSR‑Lite Shell은 선택)_

---

## 무엇이 달라졌나 (v3.2 — Tx 계층 통합)

- **Tx 통합**: 낙관 업데이트 → 서버 확정 → 실패 시 **자동 롤백(원자성 보장)**
- **ViewTransition 연계**: 서버 동기화·롤백을 **부드러운 전환**으로 처리
- **재시도 내장**: 네트워크 일시 오류에 대해 **기본 1회 재시도**(구성 가능)
- **저널 인지**: 부트 시 **미완 트랜잭션 감지**(재적용/중단 정책 확장 대비)

---

## FirstTx가 해결하는 문제

- 재방문마다 빈 화면 대기(2–3초)
- 새로고침 시 진행 중 상태 유실
- 낙관 업데이트 실패 시 **부분 롤백**으로 생기는 불일치

**FirstTx의 결과**

- 재방문 **0ms 빈 화면**(스냅샷 즉시 주입)
- 스냅샷 → 최신 데이터로의 **명시적 전환**(배지)과 **부드러운 애니메이션**
- 실패 시 **원자적 롤백**(UI/상태 일관성 유지)
- **오프라인**에서도 마지막 상태 복원

---

## 핵심 아이디어 (3 레이어)

### 1) Instant Replay (Render)

메인 번들 도착 전에 로컬 스냅샷으로 **실제 화면을 즉시** 그립니다.

- 부트 스크립트 목표: **< 2KB gzip**
- 하이드레이션 시도 → 불일치면 **replace** 로 폴백
- 스냅샷 신선도 배지(예: “23시간 전 데이터”)

### 2) Local‑First (Data)

IndexedDB 모델을 **`useSyncExternalStore + 메모리 캐시`**로 React에 **동기** 제공.

- `useModel(model) → [state, patch, history]`
- `history.isStale`, `history.age`로 UI 안내
- **멀티탭 동기화(Phase 1)** 예정

### 3) Tx (Execution)

낙관 업데이트, 서버 요청, 보상(rollback)을 **단일 트랜잭션**으로 묶어 **원자성** 보장.

- `run(fn, { compensate, retry })`
- 실패 시 **자동 롤백** + ViewTransition
- 재시도: 기본 1회(구성 가능)

---

## 빠른 시작

### 설치

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
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

### 2) 모델 정의 (Local‑First)

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
  // optional
  // version: 1,
  // initialData: { items: [], updatedAt: 0 },
});
```

### 3) Prepaint 템플릿 (Instant Replay)

```tsx
// routes/cart.prepaint.tsx
'use prepaint';
import { prepaint } from '@firsttx/prepaint';

export default prepaint((ctx) => {
  const items = ctx.snap?.cart?.items ?? [];
  const ageHours = Math.floor((ctx.snapAge ?? 0) / 3600000);

  if (items.length === 0) return <CartSkeleton />;

  return (
    <div className="cart">
      {ageHours > 0 && <span className="muted">{ageHours}h old data</span>}
      {items.map((it) => (
        <CartItem key={it.id} {...it} />
      ))}
    </div>
  );
});
```

### 4) 앱 핸드오프

```ts
// main.tsx
import { handoff } from '@firsttx/prepaint';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const root = document.getElementById('root')!;
  if (strategy === 'hydrate-match') {
    hydrateRoot(root, <App />);
  } else {
    createRoot(root).render(<App />);
  }
});
```

### 5) Tx로 낙관 업데이트 + 원자 롤백

```ts
// routes/CartPage.tsx
import { useEffect } from 'react';
import { useModel } from '@firsttx/local-first';
import { startTransaction } from '@firsttx/tx';
import { CartModel } from '../models/cart';

export default function CartPage() {
  const [cart, patch, history] = useModel(CartModel);

  if (!cart) return <CartSkeleton />; // 캐시 워밍업

  // 서버 동기화 → 부드러운 전환
  useEffect(() => {
    (async () => {
      const server = await api.getCart();
      if (!cart || server.updatedAt > cart.updatedAt) {
        const apply = () => patch((d) => {
          d.items = server.items;
          d.updatedAt = server.updatedAt;
        });
        if ('startViewTransition' in document) {
          document.startViewTransition(apply);
        } else {
          await apply();
        }
      }
    })();
  }, [cart, patch]);

  // Tx로 "+1" 처리
  const addOne = async (product: { id: string }) => {
    const tx = startTransaction({ transition: true });

    try {
      // Step 1: 낙관 패치
      await tx.run(async () => {
        await patch((d) => {
          const it = d.items.find((x) => x.id === product.id);
          if (it) it.qty += 1;
          else d.items.push({ ...product, title: '', price: 0, qty: 1 });
          d.updatedAt = Date.now();
        });
      }, {
        compensate: async () => {
          await patch((d) => {
            const it = d.items.find((x) => x.id === product.id);
            if (!it) return;
            it.qty -= 1;
            if (it.qty <= 0) d.items = d.items.filter((x) => x.id !== product.id);
            d.updatedAt = Date.now();
          });
        },
      });

      // Step 2: 서버 확정 (재시도 구성)
      await tx.run(() => api.post('/cart/add', { id: product.id }), {
        retry: { maxAttempts: 3, delayMs: 200, backoff: 'exponential' },
      });

      await tx.commit();
      toast.success('추가 완료');
    } catch (e) {
      // 실패 시 Tx가 자동 롤백 수행
      toast.error('추가 실패');
    }
  };

  return (
    <div>
      {history.isStale && (
        <Badge variant="warning">
          {Math.floor(history.age / 3600000)}시간 전 데이터
        </Badge>
      )}

      {cart.items.map((item) => (
        <CartItem key={item.id} {...item} onAdd={() => addOne(item)} />
      ))}
    </div>
  );
}
```

---

## 성능 목표

| 지표                      | 목표         | 비고                             |
| ------------------------- | ------------ | -------------------------------- |
| BlankScreenTime           | 0ms (재방문) | 부트 시 스냅샷 DOM 주입          |
| Prepaint Boot Size        | < 2KB gzip   | 인라인 부트 스크립트             |
| Hydration Success         | > 95%        | 불일치 시 replace 폴백           |
| React Sync Latency        | < 50ms       | subscribe → render (메모리 캐시) |
| ViewTransition Smoothness | > 90% @60fps | 동기화/롤백 시 적용              |
| Tx Rollback Time          | < 100ms      | 오류 → UI 복구                   |

---

## Feature Matrix

> 요청에 따라 아이콘을 최소화하고 **텍스트만**으로 표기합니다.

| 항목                 | Traditional CSR | SSR/RSC   | FirstTx (v3.2)                |
| -------------------- | --------------- | --------- | ----------------------------- |
| 첫 방문              | 2–3s            | Instant   | 2–3s (Skeleton/SSR‑Lite 옵션) |
| 재방문               | 2–3s            | Instant   | 0ms (Snapshot)                |
| 데이터 신선도        | 최신(로드 후)   | 항상 최신 | 스냅샷→최신 전환              |
| 오프라인 마지막 상태 | No              | No        | Yes                           |
| 낙관 업데이트 롤백   | Fragmented      | Complex   | Atomic                        |
| 서버 필요            | None            | Required  | None                          |

---

## 언제 사용하면 좋은가

**적합**

- 하루 수십 회 접속하는 **B2B 대시보드/어드민**
- **불안정 네트워크**(현장/모바일)에서 **오프라인 복원력**이 필요한 앱
- 새로고침/탭 전환이 잦아 **연속성**이 중요한 워크플로

**비적합**

- **SEO 필수** 화면(랜딩/블로그) → SSR/RSC 권장
- **초저지연 실시간** 트레이딩/스트리밍 → 특화 스택 권장
- **정적 콘텐츠** → SSG 권장

---

## 아키텍처 (개요)

```
┌─────────────────────────────────────┐
│ Instant Replay (Render)             │
│ Boot → Snapshot → DOM               │
└─────────────────────────────────────┘
                 ↓ read
┌─────────────────────────────────────┐
│ Local‑First (Data)                  │
│ IndexedDB + In‑mem cache (React)    │
│ (Multi‑tab sync: Phase 1 planned)   │
└─────────────────────────────────────┘
                 ↑ write
┌─────────────────────────────────────┐
│ Tx (Execution)                      │
│ Optimistic → Atomic rollback        │
│ Retry + ViewTransition              │
└─────────────────────────────────────┘
```

**데이터 흐름 요약**

1. **부트**: 스냅샷/저널 읽어 즉시 페인트 → 빈 화면 0ms
2. **핸드오프**: 하이드레이션 시도, 실패 시 교체(ViewTransition)
3. **동기화**: 서버 데이터 적용을 전환으로 감싸 부드럽게
4. **인터랙션**: Tx로 낙관 패치 → 서버 확정 → 실패 시 자동 롤백

---

## 보안 메모 (PII)

- FirstTx는 **암호화/접근제어를 내장하지 않습니다.**
- IndexedDB는 동일 출처 정책에 의존합니다.
- 민감 데이터는 **암호화 후 저장**하거나 **세션 메모리**만 사용하세요.

---

## 라이선스

MIT

---

## 연락처

- **Repository**: [github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- **Email**: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)

---

## 브라우저/런타임 요구사항

- View Transitions: **Chrome 111+** 권장(폴백 제공)
- React 18+, Node 18+
- IndexedDB 사용 가능 환경
