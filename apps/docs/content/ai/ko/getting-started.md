# Getting Started

## FirstTx란?

FirstTx는 CSR(Client-Side Rendering) React 앱을 위한 최적화 도구입니다.

재방문 시 빈 화면 제거, 오프라인 데이터 내구성, 낙관적 UI 트랜잭션을 제공합니다.

Firsttx는 세 가지 패키지로 구성됩니다

- Prepaint: 마지막 화면을 DOM 스냅샷으로 저장하고 즉시 복원합니다
- Local-First: IndexedDB 기반 데이터 레이어로 오프라인에서도 상태를 유지합니다
- Tx: 낙관적 업데이트를 트랜잭션으로 묶어 실패 시 자동 롤백합니다

## 설치

### 전체 설치 (권장)

세 패키지를 모두 사용하는 경우입니다.

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx zod
```

zod는 Local-First에서 모델 데이터의 타입과 무결성을 검증하는 데 사용됩니다. IndexedDB에 저장된 데이터가 스키마와 맞지 않으면 자동으로 정리됩니다.

### 부분 설치

필요한 기능만 선택해서 설치할 수 있습니다.

재방문 최적화만 필요한 경우:

```bash
pnpm add @firsttx/prepaint
```

재방문 + 데이터 동기화가 필요한 경우:

```bash
pnpm add @firsttx/prepaint @firsttx/local-first zod
```

데이터 동기화 + 낙관적 업데이트가 필요한 경우:

```bash
pnpm add @firsttx/local-first @firsttx/tx zod
```

### 요구 사항

- React 18.2.0 이상: createRoot, hydrateRoot API를 사용합니다
- Vite 5 이상: Prepaint 플러그인 사용 시 필요합니다
- Node.js 22 이상

## 기본 설정

각 패키지별로 필요한 설정입니다.

### Prepaint 설정 (재방문 최적화 사용 시)

#### 1. Vite 플러그인 설정

Prepaint는 Vite 플러그인으로 부트 스크립트를 HTML에 주입합니다. 이 스크립트는 React보다 먼저 실행되어 IndexedDB에서 마지막 화면을 복원합니다.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { firstTx } from "@firsttx/prepaint/plugin/vite";

export default defineConfig({
  plugins: [
    react(),
    firstTx(),
  ],
});
```

#### 2. 엔트리 포인트 설정

기존 ReactDOM.createRoot 대신 createFirstTxRoot를 사용합니다.

```tsx
// main.tsx
import { createFirstTxRoot } from "@firsttx/prepaint";
import { App } from "./App";

createFirstTxRoot(
  document.getElementById("root")!,
  <App />
);
```

createFirstTxRoot는 다음을 처리합니다:

- 페이지를 떠날 때 현재 화면을 IndexedDB에 저장합니다
- 재방문 시 React가 로드되기 전에 저장된 화면을 즉시 복원합니다
- ViewTransition API를 지원하는 브라우저에서는 부드러운 전환 효과를 적용합니다
- React 앱을 하이드레이션 또는 클라이언트 렌더로 마운트합니다

### Local-First / Tx만 사용하는 경우

Prepaint 없이 Local-First와 Tx만 사용한다면 별도의 초기 설정이 필요 없습니다. 기존 React 앱에서 바로 훅과 함수를 import해서 사용할 수 있습니다.

## 첫 번째 예제

### 모델 정의 (Local-First)

defineModel로 IndexedDB에 저장될 모델을 정의합니다.

```ts
// models/cart.ts
import { defineModel } from "@firsttx/local-first";
import { z } from "zod";

export const CartModel = defineModel("cart", {
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        qty: z.number(),
      }),
    ),
  }),
  ttl: 5 * 60 * 1000, // 5분 (기본값)
  initialData: {
    items: [],
  },
});
```

### 컴포넌트에서 사용

useSyncedModel 훅으로 모델과 서버를 동기화합니다.

```tsx
// CartPage.tsx
import { useSyncedModel } from "@firsttx/local-first";
import { CartModel } from "./models/cart";

async function fetchCart() {
  const res = await fetch("/api/cart");
  if (!res.ok) throw new Error("Failed to fetch cart");
  return res.json();
}

export function CartPage() {
  const { data: cart, isSyncing, patch } = useSyncedModel(CartModel, fetchCart, {
    syncOnMount: "stale", // TTL이 지난 경우에만 서버 동기화
  });

  if (!cart) return <div>Loading...</div>;

  return (
    <ul>
      {cart.items.map((item) => (
        <li key={item.id}>{item.name} x {item.qty}</li>
      ))}
    </ul>
  );
}
```

### 낙관적 업데이트 (Tx)

startTransaction으로 낙관적 업데이트와 서버 요청을 하나의 트랜잭션으로 묶습니다. 서버 요청이 실패하면 자동으로 롤백됩니다.

```ts
// cart-actions.ts
import { startTransaction } from "@firsttx/tx";
import { CartModel } from "./models/cart";

export async function addToCart(item: { id: string; name: string; qty: number }) {
  const tx = startTransaction();

  // 1단계: 로컬 모델 업데이트 (즉시 UI 반영)
  await tx.run(
    () => CartModel.patch((draft) => {
      draft.items.push(item);
    }),
    {
      // 실패 시 롤백
      compensate: () => CartModel.patch((draft) => {
        draft.items.pop();
      }),
    }
  );

  // 2단계: 서버에 반영
  await tx.run(() =>
    fetch("/api/cart", {
      method: "POST",
      body: JSON.stringify(item),
    })
  );

  await tx.commit();
}
```
