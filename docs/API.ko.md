# API Reference

## Prepaint

### `createFirstTxRoot(container, element, options?)`

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

## Local-First

### `defineModel(key, options)`

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

### `useSyncedModel(model, fetcher, options?)`

모델과 서버를 자동 동기화합니다.

```tsx
const { data, status, patch, sync, isSyncing, error, history } = useSyncedModel(
  CartModel,
  fetchCart,
  {
    syncOnMount: 'stale',
    onSuccess: (data) => console.log('Synced'),
    onError: (err) => console.error(err),
  },
);
```

**Parameters**

- `model: Model<T>` - defineModel로 생성한 모델
- `fetcher: (current: T | null) => Promise<T>` - 서버 데이터를 가져오는 함수. `current`는 현재 로컬에 저장된 데이터 (없으면 `null`)
  - 증분 업데이트: 마지막 업데이트 이후 변경분만 요청
  - 조건부 요청: 로컬 데이터가 유효하면 서버 요청 생략
  - 병합: 로컬 상태와 서버 상태 결합
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
- `status: 'loading' | 'success' | 'error'` - 현재 로딩 상태
- `patch: (fn: (draft: T) => void) => Promise<void>` - 기존 데이터를 draft 뮤테이션으로 업데이트
- `replace: (data: T) => Promise<void>` - 전체 데이터 교체
- `sync: () => Promise<void>` - 수동 동기화
- `isSyncing: boolean` - 서버 동기화 중 여부
- `error: Error | null` - 동기화 에러
- `history: ModelHistory` - 메타데이터
  - `age: number` - 마지막 업데이트로부터 경과 시간 (ms)
  - `isStale: boolean` - TTL 초과 여부
  - `updatedAt: number` - 마지막 업데이트 타임스탬프

### `useSuspenseSyncedModel(model, fetcher)`

**React 18.2+ 지원.** 선언적 데이터 페칭을 위한 Suspense 통합 훅입니다.

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

- 수동 로딩 체크 불필요 - Suspense 자동 통합
- Non-nullable 반환 타입으로 타입 안정성 향상
- Error Boundary 자동 통합
- `<Suspense>` 경계로 감싸야 함
- 읽기 전용 (mutations는 `useSyncedModel` 사용)

### `patch()` vs `replace()` 언제 사용할까요?

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

**중요: `patch()`는 기존 데이터가 필요합니다**

데이터가 `null`일 때 `patch()`를 사용하면, `initialData`를 제공하지 않은 경우 에러가 발생합니다:

```tsx
// 에러: 데이터가 null일 때 patch 불가
const AuthModel = defineModel('auth', {
  schema: AuthSchema.nullable(),
  initialData: null,  // 데이터가 null로 시작
});

await AuthModel.patch((draft) => {
  draft.token = 'xxx'; // 에러: null의 속성을 읽을 수 없음
});

// replace를 대신 사용하세요
await AuthModel.replace({ token: 'xxx', user: {...} });
```

### 탭 간 동기화 (Cross-Tab Synchronization)

모든 열린 탭에서 모델 변경 사항을 자동으로 동기화합니다.

- 탭 간 동기화 지연: 약 1ms
- 네트워크 오버헤드 없음 (브라우저 내부 통신)
- 모든 탭 간 자동 일관성 보장
- 구형 브라우저에서도 우아하게 폴백 (97% 이상 지원)

---

## Tx

### `startTransaction(options?)`

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

### `useTx(config)`

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

**매개변수 (Parameters)**

- `config.optimistic` - 로컬 상태를 즉시 업데이트하는 함수
- `config.rollback` - 실패 시 롤백 함수
- `config.request` - 서버 요청 함수
- `config.transition?` - ViewTransition 사용 여부 (기본값: `true`)
- `config.retry?` - 재시도 설정 `{ maxAttempts?, delayMs?, backoff?: 'exponential' | 'linear' }`
- `config.onSuccess?` - 성공 콜백
- `config.onError?` - 실패 콜백

**반환값 (Returns)**

- `mutate(variables)` - 트랜잭션 실행 함수
- `isPending`, `isError`, `isSuccess` - 상태 플래그
- `error` - 오류 객체
