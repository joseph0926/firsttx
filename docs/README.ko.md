<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

**재방문 시 빈 화면 제거 - 마지막 상태를 즉시 복원합니다**

<table>
<tr>
<td align="center">❌ Before FirstTx</td>
<td align="center">✅ After FirstTx</td>
</tr>
<tr>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-01_vi2svy.gif" /></td>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-02_tfmsy7.gif" /></td>
</tr>
<tr>
<td align="center"><sub>Slow 4G: 빈 화면 노출</sub></td>
<td align="center"><sub>Slow 4G: 즉시 복원</sub></td>
</tr>
</table>

## Is FirstTx for you?

이런 경험 있으신가요?

- 사용자가 "로딩이 느려요" 불평
- 재방문이 잦은 내부 도구 개발 중
- 새로고침 시 작업 내용 소실
- SSR 장점은 가져오고싶은데 CSR은 유지해야하는 경우

-> 하나라도 해당된다면 FirstTx가 도움이 될 수 있습니다

## Installation

**대부분의 경우 (권장)**

```bash
pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
```

<details>
<summary>특정 기능만 필요한 경우</summary>

**재방문 최적화만**

```bash
pnpm add @firsttx/prepaint
```

**재방문 + 데이터 동기화**

```bash
pnpm add @firsttx/prepaint @firsttx/local-first
```

**데이터 동기화 + 낙관적 업데이트**

```bash
pnpm add @firsttx/local-first @firsttx/tx
```

> ⚠️ **의존성:** Tx는 Local-First를 필요로 합니다.

</details>

## Quick Start

### 1. Vite 플러그인 설정

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [firstTx()],
});
```

<details>
<summary>어떻게 작동하나요?</summary>

Vite 플러그인은 부트 스크립트를 HTML에 자동 주입합니다. 이 스크립트가 페이지 로드 시 IndexedDB에서 저장된 화면을 즉시 복원합니다.

</details>

### 2. 진입점 설정

```ts
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

<details>
<summary>어떻게 작동하나요?</summary>

`createFirstTxRoot`는

1. 페이지를 떠날 때 화면을 IndexedDB에 저장
2. 재방문 시 React 로드 전에 즉시 복원
3. Hydration 또는 Client Render로 실제 앱 마운트

</details>

### 3. 데이터 모델 정의

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
        qty: z.number(),
      }),
    ),
  }),
  ttl: 5 * 60 * 1000,
});
```

### 4. 컴포넌트에서 사용

```tsx
import { useSyncedModel } from '@firsttx/local-first';
import { CartModel } from './models/cart';

function CartPage() {
  const { data: cart } = useSyncedModel(CartModel, () => fetch('/api/cart').then((r) => r.json()));

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

### 5. 낙관적 업데이트 (선택)

```ts
import { startTransaction } from '@firsttx/tx';

async function addToCart(item) {
  const tx = startTransaction();

  await tx.run(
    () =>
      CartModel.patch((draft) => {
        draft.items.push(item);
      }),
    {
      compensate: () =>
        CartModel.patch((draft) => {
          draft.items.pop();
        }),
    },
  );

  await tx.run(() =>
    fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  );

  await tx.commit();
}
```

<details>
<summary>어떻게 작동하나요?</summary>

트랜잭션은 여러 단계를 하나의 원자적 작업으로 묶습니다. 서버 요청이 실패하면 `compensate` 함수가 자동으로 실행되어 로컬 변경사항을 되돌립니다.

</details>

## Examples

실제 동작하는 예제로 FirstTx를 체험해보세요

### Interactive Playground

9가지 시나리오로 각 기능을 직접 테스트해볼 수 있습니다

**[Playground 열기](https://firsttx-playground.vercel.app)**<br/>
**[Playground 코드](https://github.com/joseph0926/firsttx/tree/main/apps/playground)**

- Prepaint: 즉시 복원 / 라우터 통합
- Sync: 충돌 해결 / 타이밍 공격 / Staleness
- Tx: 동시 업데이트 / 롤백 체인 / 네트워크 혼란

---

💡 **API 옵션이 궁금하신가요?** -> [API Reference](#api-reference)로 이동

## API Reference

### Prepaint

#### `createFirstTxRoot(container, element, options?)`

React 진입점을 생성하고 Prepaint 캡처를 설정합니다.

```tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />, { transition: true });
```

**Parameters**

- `container: HTMLElement` - 마운트할 DOM 요소
- `element: ReactElement` - 렌더링할 React 엘리먼트
- `options?: { transition?: boolean }` - ViewTransition 사용 여부 (기본값: `true`)

---

### Local-First

#### `defineModel(key, options)`

IndexedDB 모델을 정의합니다.

```tsx
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const CartModel = defineModel('cart', {
  schema: z.object({ items: z.array(...) }),
  ttl: 5 * 60 * 1000,
});
```

**Parameters**

- `key: string` - IndexedDB 키 (고유해야 함)
- `options.schema: ZodSchema` - Zod 스키마
- `options.ttl?: number` - Time-to-live (밀리초, 기본값: 무제한)

#### `useSyncedModel(model, fetcher, options?)`

모델과 서버를 자동 동기화합니다.

```tsx
const { data, patch, sync, isSyncing, error, history } = useSyncedModel(CartModel, fetchCart, {
  syncOnMount: 'stale',
  onSuccess: (data) => console.log('Synced'),
  onError: (err) => console.error(err),
});
```

**Parameters**

- `model: Model<T>` - defineModel로 생성한 모델
- `fetcher: () => Promise<T>` - 서버 데이터를 가져오는 함수
- `options?: SyncOptions`

**SyncOptions**

- `syncOnMount?: 'always' | 'stale' | 'never'` (기본값: `'stale'`)
  - `'always'`: 마운트 시 항상 동기화
  - `'stale'`: TTL 초과 시에만 동기화
  - `'never'`: 수동 동기화만
- `onSuccess?: (data: T) => void`
- `onError?: (error: Error) => void`

**Returns**

- `data: T | null` - 현재 데이터
- `patch: (fn: (draft: T) => void) => Promise<void>` - 로컬 업데이트
- `sync: () => Promise<void>` - 수동 동기화
- `isSyncing: boolean` - 동기화 중 여부
- `error: Error | null` - 동기화 에러
- `history: ModelHistory` - 메타데이터
  - `age: number` - 마지막 업데이트로부터 경과 시간 (ms)
  - `isStale: boolean` - TTL 초과 여부
  - `updatedAt: number` - 마지막 업데이트 타임스탬프

---

### Tx

#### `startTransaction(options?)`

원자적 트랜잭션을 시작합니다.

```tsx
import { startTransaction } from '@firsttx/tx';

const tx = startTransaction({ transition: true });

await tx.run(
  () =>
    CartModel.patch((draft) => {
      /* update */
    }),
  {
    compensate: () =>
      CartModel.patch((draft) => {
        /* rollback */
      }),
    retry: { maxAttempts: 1 },
  },
);

await tx.commit();
```

**Parameters**

- `options?: { transition?: boolean }` - ViewTransition 사용 여부 (기본값: `true`)

**Methods**

- `tx.run(fn, options?)` - 트랜잭션 단계 추가
  - `fn: () => Promise<void>` - 실행할 함수
  - `options.compensate?: () => Promise<void>` - 롤백 함수
  - `options.retry?: { maxAttempts: number }` - 재시도 설정 (기본값: 1회)
- `tx.commit()` - 트랜잭션 커밋 (실패 시 자동 롤백)

---

💡 **실전 예제가 필요하신가요?** → [Examples](#examples)로 돌아가기

## Features

### Prepaint - 재방문 0ms

페이지를 떠날 때 화면을 IndexedDB에 자동 저장하고, 재방문 시 React 로드 전에 즉시 복원합니다.

**핵심 기술**

- Inline boot script (<2KB)
- ViewTransition 통합
- Hydration fallback 자동 처리

**성능**

- Blank Screen Time: ~0ms
- Prepaint Time: <20ms
- Hydration Success: >80%

---

### Local-First - 자동 동기화

IndexedDB와 React를 useSyncExternalStore로 연결하여 동기적인 상태 읽기를 보장합니다.

**핵심 기능**

- TTL 기반 자동 만료
- Stale 감지 및 자동 refetch
- Zod 스키마 검증
- 버전 관리

**DX 개선**

- 동기화 보일러플레이트 ~90% 감소
- React Sync Latency: <50ms

---

### Tx - 원자적 롤백

낙관적 업데이트와 서버 요청을 하나의 트랜잭션으로 묶어, 실패 시 자동 롤백합니다.

**핵심 기능**

- 보상 기반 롤백 (역순 실행)
- 재시도 전략 (linear/exponential backoff)
- ViewTransition 통합

**안정성**

- Rollback Time: <100ms
- ViewTransition Smooth: >90%

---

## 브라우저 지원

| 브라우저    | 최소 버전 | ViewTransition | 상태                    |
| ----------- | --------- | -------------- | ----------------------- |
| Chrome/Edge | 111+      | ✅ 완전 지원   | ✅ 테스트 완료          |
| Firefox     | 최신      | ❌ 미지원      | ✅ Graceful degradation |
| Safari      | 16+       | ❌ 미지원      | ✅ Graceful degradation |

> ViewTransition이 없어도 핵심 기능은 모두 작동합니다.

---

## 적합한 경우

✅ **FirstTx를 선택하세요**

- 내부 도구 (CRM, 대시보드, 어드민)
- 재방문이 잦은 앱 (하루 10회+)
- SEO가 필요 없는 앱
- 복잡한 클라이언트 인터랙션

❌ **다른 솔루션을 고려하세요**

- 공개 랜딩/마케팅 사이트 → SSR/SSG
- 최초 방문 성능이 최우선 → SSR
- 항상 최신 데이터 필수 → Server-driven UI

---

## 문제 해결

**Q: 새로고침 시 UI가 중복됩니다**
A: Vite 플러그인에서 `overlay: true` 옵션을 활성화하세요.

**Q: Hydration 경고가 발생합니다**
A: 자주 변하는 요소에 `data-firsttx-volatile` 속성을 추가하세요.

**Q: TypeScript 오류가 발생합니다**
A: `declare const __FIRSTTX_DEV__: boolean` 전역 선언을 추가하세요.

더 많은 문제 해결은 [GitHub Issues](https://github.com/joseph0926/firsttx/issues)에서 확인하세요.

---

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)

---

## 링크

- [GitHub Repository](https://github.com/joseph0926/firsttx)
- [Issues](https://github.com/joseph0926/firsttx/issues)
- 이메일: [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)
