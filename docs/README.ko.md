# FirstTx

**CSR 앱의 재방문 경험을 SSR 수준으로 만드는 통합 시스템**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)]()

> 두 번째 방문부터 마지막 상태를 즉시 복원하고, 낙관적 업데이트를 안전하게 롤백하여 서버 없이도 빠르고 일관된 경험을 제공합니다.

---

## FirstTx가 해결하는 문제

**CSR 앱의 고질적인 문제:**

```
❌ 재방문할 때마다 빈 화면 (2-3초 대기)
❌ 새로고침 시 작업 상태 손실
❌ 낙관 업데이트 실패 시 일부만 롤백되는 불일치
```

**FirstTx의 해결:**

```
✅ 재방문 시 0ms에 마지막 상태 복원
✅ 오프라인에서도 작업 상태 유지
✅ 원자적 롤백으로 완벽한 일관성
```

---

## 핵심 아이디어

FirstTx는 세 개의 레이어가 함께 작동하는 통합 시스템입니다:

### Prepaint (렌더 계층)

메인 번들 도착 전, 초소형 부트러너(2-5KB)가 로컬 스냅샷을 읽어 **0ms에 실제 데이터로 화면을 그립니다.**

### Local-First (데이터 계층)

IndexedDB 기반 모델로 상태를 저장하고, **멀티탭에서 자동 동기화**합니다. TTL과 PII 정책으로 안전성을 보장합니다.

### Tx (실행 계층)

변이, 라우팅, 캐시 무효화를 **하나의 트랜잭션**으로 묶어 **원자적 커밋/롤백**을 보장합니다.

---

## 빠른 시작

### 설치

```bash
pnpm add @fristtx/prepaint @fristtx/local-first @fristtx/tx
```

### 1. Vite 플러그인 설정

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import prepaint from '@fristtx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

### 2. 모델 정의

```typescript
// models/cart.ts
import { defineModel } from '@fristtx/local-first';
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
  }),
  ttl: 5 * 60 * 1000, // 5분
});
```

### 3. Prepaint 템플릿 작성

```tsx
// routes/cart.prepaint.tsx
'use prepaint';
import { prepaint } from '@fristtx/prepaint';

export default prepaint((ctx) => {
  const items = ctx.snap?.cart?.items ?? [];
  const ageHours = Math.floor(ctx.snapAge / 3600000);

  if (items.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className="cart">
      {ageHours > 0 && <span className="text-gray-500">{ageHours}시간 전 데이터</span>}
      {items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
});
```

### 4. 트랜잭션으로 낙관 업데이트

```typescript
import { startTransaction } from '@fristtx/tx';
import { CartModel } from './models/cart';

async function addToCart(product) {
  const tx = startTransaction('add-to-cart');

  // 낙관 패치
  await tx.run(
    async () => {
      await CartModel.patch((draft) => {
        const item = draft.items.find((x) => x.id === product.id);
        if (item) item.qty += 1;
        else draft.items.push({ ...product, qty: 1 });
      });
    },
    {
      compensate: async () => {
        await CartModel.patch((draft) => {
          const item = draft.items.find((x) => x.id === product.id);
          if (!item) return;
          item.qty -= 1;
          if (item.qty <= 0) {
            draft.items = draft.items.filter((x) => x.id !== product.id);
          }
        });
      },
    },
  );

  // 서버 확정
  await tx.run(() => api.post('/cart/add', { id: product.id }), {
    retry: { maxAttempts: 3 },
  });

  await tx.commit();
}
```

### 5. 앱 핸드오프

```typescript
// main.tsx
import { handoff } from '@fristtx/prepaint'

handoff({ mode: 'auto', transition: true }).then((strategy) => {
  const container = document.getElementById('root')!

  if (strategy === 'hydrate-match') {
    hydrateRoot(container, <App />)
  } else {
    createRoot(container).render(<App />)
  }
})
```

완료! 이제 재방문 시 마지막 상태가 즉시 복원됩니다. 🎉

---

## 📊 성능 비교

| 시나리오      | 기존 CSR  | SSR/RSC   | FirstTx              |
| ------------- | --------- | --------- | -------------------- |
| **첫 방문**   | 🐌 2-3초  | ⚡ 즉시   | 🐌 2-3초 (스켈레톤)  |
| **재방문**    | 🐌 2-3초  | ⚡ 즉시   | ⚡ 0ms (실제 데이터) |
| **오프라인**  | ❌ 불가능 | ❌ 불가능 | ✅ 마지막 상태 유지  |
| **서버 비용** | ✅ 없음   | ❌ 높음   | ✅ 없음              |
| **낙관 롤백** | ⚠️ 파편화 | ⚠️ 복잡   | ✅ 원자적            |

---

## 언제 사용하나요?

### ✅ 적합한 경우

**B2B SaaS 대시보드**

- 하루 수십 번 접속하는 직원들
- 매번 2초 × 50회 = 월 33분 손실 해결

**사내 어드민/운영 도구**

- 고객 전화 중 시스템 접속 시 대기 시간 제거
- 불안정한 네트워크 환경 (창고, 매장)

**현장 작업 앱**

- 건설/의료/물류 등 모바일 네트워크 불안정
- 오프라인 작업 후 자동 동기화

### ❌ 부적합한 경우

**SEO 중심 앱**

- 랜딩 페이지, 블로그 → SSR/RSC 권장

**초저지연 요구**

- 실시간 거래 시스템 → WebSocket 권장

**정적 콘텐츠**

- 문서 사이트 → SSG 권장

---

## 아키텍처

```
┌─────────────────────────────────────┐
│   Prepaint (렌더 계층)              │
│   부트러너 → 스냅샷 로드 → DOM 주입 │
└─────────────────────────────────────┘
                 ↓ 읽기
┌─────────────────────────────────────┐
│   Local-First (데이터 계층)         │
│   IndexedDB + 멀티탭 동기화         │
└─────────────────────────────────────┘
                 ↑ 쓰기
┌─────────────────────────────────────┐
│   Tx (실행 계층)                     │
│   낙관 업데이트 + 원자적 롤백       │
└─────────────────────────────────────┘
```

**데이터 흐름:**

1. **부트**: HTML → 부트러너 → 스냅샷 → Prepaint DOM
2. **핸드오프**: 메인 앱 → 수화/치환 → React 활성화
3. **인터랙션**: Tx 시작 → 낙관 패치 → 서버 → 커밋/롤백

---

## 라이선스

MIT

---

## 문의

- **Repository**: [github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- **Email**: joseph0926.dev@gmail.com
