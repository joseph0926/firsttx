<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx Logo" width="720" />
</p>

# FirstTx

[Docs](https://www.firsttx.store)

**재방문 시 빈 화면 제거 - 마지막 상태를 즉시 복원합니다**

## Demo

### Prepaint

<table>
<tr>
<td align="center">❌ Before prepaint</td>
<td align="center">✅ After prepaint</td>
</tr>
<tr>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-01_vi2svy.gif" /></td>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-02_tfmsy7.gif" /></td>
</tr>
<tr>
<td align="center"><sub>Slow 4G: Blank screen exposed</sub></td>
<td align="center"><sub>Slow 4G: Instant restore</sub></td>
</tr>
</table>

### TX

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400068/firsttx-tx-01_blkctj.gif" />

### Local First

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760400559/firsttx-local-01_zwhtge.gif" />

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
  // ttl은 선택 사항 - 기본값 5분
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

## DevTools로 디버깅하기

<img src="https://res.cloudinary.com/dx25hswix/image/upload/v1761388489/firsttx-devtools-01_ru58a6.png" alt="Event List" width="600" />

FirstTx 앱의 이벤트 라이프사이클을 완전히 가시화하여 디버깅할 수 있습니다.

**[DevTools 확장 프로그램 설치](https://github.com/joseph0926/firsttx/tree/main/packages/devtools#installation)**

### 무엇을 볼 수 있나요?

**Timeline 뷰**

- Prepaint → Model → Tx 실행을 시각적으로 보여주는 타임라인
- 트랜잭션 ID와 모델 이름별 이벤트 그룹핑
- 상태 표시 (성공/에러/진행중)

**이벤트 필터링**

- 카테고리, 우선순위, 검색어로 필터링
- 에러 전용 모드로 빠른 디버깅
- 실시간 이벤트 수 표시

**흔한 디버깅 시나리오**

```tsx
// 디버그: "왜 prepaint 복원이 안 됐지?"
// → DevTools에서 'restore' 이벤트 확인
// → 'hydration.error' 이벤트 찾아보기

// 디버그: "어느 모델이 계속 re-sync하지?"
// → Model 카테고리로 필터링
// → 'sync.start' 이벤트의 trigger 필드 확인

// 디버그: "트랜잭션 롤백됐는데 UI가 깨졌어"
// → Timeline에서 txId 찾기
// → 'rollback.fail' 이벤트가 있는지 확인
```

### 요구사항

- Chrome 111+ (Edge 111+)
- DevTools를 지원하는 FirstTx 패키지:
  - `@firsttx/prepaint@^0.3.3`
  - `@firsttx/local-first@^0.4.1`
  - `@firsttx/tx@^0.2.2`

**더 알아보기:** [DevTools 문서](https://github.com/joseph0926/firsttx/tree/main/packages/devtools)

---

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
  ttl: 5 * 60 * 1000, // 선택 사항
});
```

**Parameters**

- `key: string` - IndexedDB 키 (고유해야 함)
- `options.schema: ZodSchema` - Zod 스키마
- `options.ttl?: number` - Time-to-live (밀리초, 기본값: `5 * 60 * 1000` = 5분)
- `options.version?: number` - 스키마 버전 (마이그레이션용)
- `options.initialData?: T` - 초기 데이터 (version 설정 시 필수)
- `options.merge?: (current: T, incoming: T) => T` - 충돌 해결 함수

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
- `patch: (fn: (draft: T) => void) => Promise<void>` - 기존 데이터를 draft 뮤테이션으로 업데이트
- `replace: (data: T) => Promise<void>` - 전체 데이터 교체
- `sync: () => Promise<void>` - 수동 동기화
- `isSyncing: boolean` - 동기화 중 여부
- `error: Error | null` - 동기화 에러
- `history: ModelHistory` - 메타데이터
  - `age: number` - 마지막 업데이트로부터 경과 시간 (ms)
  - `isStale: boolean` - TTL 초과 여부
  - `updatedAt: number` - 마지막 업데이트 타임스탬프

#### `useSuspenseSyncedModel(model, fetcher)`

**React 19+ 전용.** 선언적 데이터 페칭을 위한 Suspense 통합 훅입니다.

```tsx
import { useSuspenseSyncedModel } from '@firsttx/local-first';

function ContactsList() {
  const contacts = useSuspenseSyncedModel(ContactsModel, fetchContacts);
  return (
    <div>
      {contacts.map((c) => (
        <ContactCard key={c.id} {...c} />
      ))}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorAlert />}>
      <Suspense fallback={<Skeleton />}>
        <ContactsList />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Parameters**

- `model: Model<T>` - defineModel로 생성한 모델
- `fetcher: (current: T | null) => Promise<T>` - 비동기 데이터 fetcher

**Returns** `T` (`null`이 아님)

**주요 차이점:**

- ✅ 수동 로딩 체크 불필요 - Suspense 자동 통합
- ✅ Non-nullable 반환 타입으로 타입 안정성 향상
- ✅ Error Boundary 자동 통합
- ❌ React 19+ 필수 (`use()` 훅 사용)
- ❌ `<Suspense>` 경계로 감싸야 함
- ❌ 읽기 전용 (mutations는 `useSyncedModel` 사용)

#### `patch()` vs `replace()` 언제 사용할까요?

**`patch()` 사용 시기:**

- 이미 데이터가 존재할 때 (`data !== null`)
- Immer 스타일의 draft 뮤테이션으로 특정 필드를 수정하고 싶을 때
- 예시: 장바구니에 아이템 추가, 카운터 업데이트

```tsx
// 기존 데이터 수정
await patch((draft) => {
  draft.items.push(newItem);
  draft.total += newItem.price;
  // return 문 없음 - draft를 직접 수정
});
```

**`replace()` 사용 시기:**

- 데이터를 완전히 교체하고 싶을 때 (`null` 포함)
- 초기 상태가 `null`이고 처음으로 값을 설정할 때
- 예시: 로그인 (null → 사용자 데이터), 로그아웃 (사용자 → null)

```tsx
// 로그인 - 초기 데이터 설정
await replace({ accessToken: 'xxx', user: {...} });

// 로그아웃 - 데이터 초기화
await replace(null);
```

**⚠️ 중요: `patch()`는 기존 데이터가 필요합니다**

데이터가 `null`일 때 `patch()`를 사용하면, `initialData`를 제공하지 않은 경우 에러가 발생합니다:

```tsx
// ❌ 에러: 데이터가 null일 때 patch 불가
const AuthModel = defineModel('auth', {
  schema: AuthSchema.nullable(),
  initialData: null,  // 데이터가 null로 시작
});

await AuthModel.patch((draft) => {
  draft.token = 'xxx'; // 에러: null의 속성을 읽을 수 없음
});

// ✅ replace를 대신 사용하세요
await AuthModel.replace({ token: 'xxx', user: {...} });
```

#### 탭 간 동기화 (Cross-Tab Synchronization)

모든 열린 탭에서 **모델 변경 사항을 자동으로 동기화**합니다.
`BroadcastChannel API`를 사용하여 브라우저 내부에서 실시간으로 통신합니다.

- 탭 간 동기화 지연: 약 **1ms**
- **네트워크 오버헤드 없음** (브라우저 내부 통신)
- 모든 탭 간 **자동 일관성 보장**
- **구형 브라우저에서도 우아하게 폴백** (97% 이상 지원)

---

### Tx

#### `startTransaction(options?)`

원자적(atomic) 트랜잭션을 시작합니다.

```tsx
import { startTransaction } from '@firsttx/tx';

const tx = startTransaction({ transition: true });

await tx.run(
  () =>
    CartModel.patch((draft) => {
      /* 업데이트 */
    }),
  {
    compensate: () =>
      CartModel.patch((draft) => {
        /* 롤백 */
      }),
    retry: {
      maxAttempts: 3,
      delayMs: 1000,
      backoff: 'exponential', // 또는 'linear'
    },
  },
);

await tx.commit();
```

**tx.run 매개변수**

- `fn: () => Promise<T>` - 실행할 함수
- `options?.compensate: () => Promise<void>` - 실패 시 롤백 함수
- `options?.retry: RetryConfig` - 재시도 설정
  - `maxAttempts?: number` - 최대 재시도 횟수 (기본값: `1`)
  - `delayMs?: number` - 재시도 간 기본 대기 시간(밀리초, 기본값: `100`)
  - `backoff?: 'exponential' | 'linear'` - 백오프 전략 (기본값: `'exponential'`)

**백오프 전략:**

- `exponential`: 100ms → 200ms → 400ms → 800ms (delay × 2^시도횟수)
- `linear`: 100ms → 200ms → 300ms → 400ms (delay × 시도횟수)

---

#### `useTx(config)`

트랜잭션을 간단하게 관리하기 위한 React 훅입니다.

```tsx
import { useTx } from '@firsttx/tx';

const { mutate, isPending, isError, error } = useTx({
  optimistic: async (item) => {
    await CartModel.patch((draft) => draft.items.push(item));
  },
  rollback: async (item) => {
    await CartModel.patch((draft) => draft.items.pop());
  },
  request: async (item) =>
    fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  onSuccess: () => toast.success('완료되었습니다!'),
});

// 사용 예시
<button onClick={() => mutate(newItem)} disabled={isPending}>
  {isPending ? '추가 중...' : '장바구니에 추가'}
</button>;
```

---

**매개변수 (Parameters)**

- `config.optimistic` — 로컬 상태를 즉시 업데이트하는 함수
- `config.rollback` — 실패 시 롤백 함수
- `config.request` — 서버 요청 함수
- `config.transition?` — ViewTransition 사용 여부 (기본값: `true`)
- `config.retry?` — 재시도 설정 `{ maxAttempts?, delayMs?, backoff?: 'exponential' | 'linear' }`
- `config.onSuccess?` — 성공 콜백
- `config.onError?` — 실패 콜백

---

**반환값 (Returns)**

- `mutate(variables)` — 트랜잭션 실행 함수
- `isPending`, `isError`, `isSuccess` — 상태 플래그
- `error` — 오류 객체

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
