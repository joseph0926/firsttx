# Local-First

## Local-First란?

Local-First는 IndexedDB 기반의 데이터 레이어입니다. 서버 데이터를 로컬에 캐싱하고, 오프라인에서도 데이터를 유지하며, 여러 탭 간에 실시간으로 동기화합니다.

주요 특징:

- Zod 스키마로 데이터 타입과 무결성을 검증합니다
- TTL(Time-To-Live) 기반의 캐시 만료 관리를 제공합니다
- BroadcastChannel을 통해 탭 간 실시간 동기화를 지원합니다
- React 18의 useSyncExternalStore를 사용하여 안정적인 상태 관리를 제공합니다

## defineModel

모델을 정의합니다. 모델은 IndexedDB에 저장되는 데이터 단위입니다.

```typescript
import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

const UserModel = defineModel('user', {
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  initialData: {
    id: '',
    name: '',
    email: '',
  },
  ttl: 5 * 60 * 1000, // 5분
});
```

### 옵션

| 옵션          | 타입                             | 필수                 | 기본값              | 설명                                                                   |
| ------------- | -------------------------------- | -------------------- | ------------------- | ---------------------------------------------------------------------- |
| `schema`      | `z.ZodType<T>`                   | O                    | -                   | Zod 스키마. 데이터 검증에 사용됩니다                                   |
| `initialData` | `T`                              | version 사용 시 필수 | -                   | 초기 데이터. 저장된 데이터가 없거나 버전이 변경되었을 때 사용됩니다    |
| `version`     | `number`                         | X                    | -                   | 스키마 버전. 변경 시 기존 데이터를 삭제하고 initialData로 초기화합니다 |
| `ttl`         | `number`                         | X                    | `300000` (5분)      | 캐시 만료 시간(ms). 이 시간이 지나면 데이터가 stale 상태가 됩니다      |
| `merge`       | `(current: T, incoming: T) => T` | X                    | `(_, next) => next` | 서버 데이터와 로컬 데이터를 병합하는 함수입니다                        |

### version과 initialData

`version`을 지정하면 스키마가 변경되었을 때 기존 데이터를 자동으로 마이그레이션할 수 있습니다.

```typescript
const CartModel = defineModel('cart', {
  schema: z.object({
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      qty: z.number(),
      // v2에서 추가된 필드
      price: z.number(),
    })),
  }),
  version: 2, // 버전을 올리면 기존 v1 데이터는 삭제됨
  initialData: {
    items: [],
  },
});
```

`version`을 사용할 때는 반드시 `initialData`를 함께 제공해야 합니다. 버전이 변경되면 기존 데이터는 삭제되고 `initialData`로 초기화됩니다.

### merge 함수

서버에서 받은 데이터와 로컬 데이터를 병합하는 방법을 정의합니다. 기본 동작은 서버 데이터로 완전히 덮어씁니다.

```typescript
const CartModel = defineModel('cart', {
  schema: cartSchema,
  initialData: { items: [] },
  // 로컬에만 있는 아이템을 유지하면서 서버 데이터 병합
  merge: (local, server) => ({
    items: [
      ...server.items,
      ...local.items.filter(
        localItem => !server.items.some(s => s.id === localItem.id)
      ),
    ],
  }),
});
```

## Model 메서드

defineModel이 반환하는 Model 객체는 다음 메서드를 제공합니다.

### patch

로컬 데이터를 부분 수정합니다. 낙관적 업데이트에 사용됩니다.

```typescript
await CartModel.patch((draft) => {
  draft.items.push({ id: '1', name: '상품', qty: 1 });
});
```

mutator 함수는 structuredClone으로 복제된 데이터를 받습니다. 함수 내에서 직접 수정하면 됩니다. 수정 후 Zod 스키마로 검증되며, 검증 실패 시 ValidationError가 발생합니다.

### replace

전체 데이터를 교체합니다. 서버 동기화 시 내부적으로 호출됩니다.

```typescript
const serverData = await fetchCart();
await CartModel.replace(serverData);
```

`merge` 옵션이 정의되어 있으면 기존 데이터와 병합됩니다.

### getSnapshot

IndexedDB에서 현재 데이터를 비동기로 조회합니다.

```typescript
const data = await CartModel.getSnapshot();
if (data) {
  console.log('저장된 데이터:', data);
}
```

### getHistory

데이터의 메타정보를 조회합니다.

```typescript
const history = await CartModel.getHistory();
console.log('마지막 업데이트:', new Date(history.updatedAt));
console.log('stale 여부:', history.isStale);
```

## useModel

모델 데이터를 구독하는 기본 훅입니다. 서버 동기화 없이 로컬 데이터만 사용할 때 적합합니다.

```typescript
import { useModel } from '@firsttx/local-first';

function CartBadge() {
  const { data, status, error, history, patch } = useModel(CartModel);

  if (status === 'loading') return <span>...</span>;
  if (status === 'error') return <span>!</span>;

  return <span>{data?.items.length ?? 0}</span>;
}
```

### 반환값

| 필드      | 타입                                             | 설명                                          |
| --------- | ------------------------------------------------ | --------------------------------------------- |
| `data`    | `T \| null`                                      | 현재 데이터. 로딩 중이거나 에러 시 null입니다 |
| `status`  | `'loading' \| 'success' \| 'error'`              | 현재 상태입니다                               |
| `error`   | `FirstTxError \| null`                           | 에러 객체입니다                               |
| `history` | `ModelHistory`                                   | 메타데이터입니다                              |
| `patch`   | `(mutator: (draft: T) => void) => Promise<void>` | 데이터 수정 함수입니다                        |

## useSyncedModel

서버 동기화 기능이 포함된 훅입니다. 대부분의 경우 이 훅을 사용합니다.

```typescript
import { useSyncedModel } from '@firsttx/local-first';

async function fetchCart(current: Cart | null) {
  const res = await fetch('/api/cart');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

function CartPage() {
  const { data, status, isSyncing, sync, patch, error } = useSyncedModel(
    CartModel,
    fetchCart,
    {
      syncOnMount: 'stale',
      onSuccess: (data) => console.log('동기화 완료:', data),
      onError: (error) => console.error('동기화 실패:', error),
    }
  );

  return (
    <div>
      {isSyncing && <span>동기화 중...</span>}
      <button onClick={sync}>새로고침</button>
      <ul>
        {data?.items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### fetcher 함수

fetcher는 현재 로컬 데이터를 인자로 받습니다. 이를 활용하여 증분 동기화를 구현할 수 있습니다.

```typescript
async function fetchCart(current: Cart | null) {
  // current가 있으면 마지막 동기화 이후 변경분만 요청
  const since = current ? `?since=${current.lastSync}` : '';
  const res = await fetch(`/api/cart${since}`);
  return res.json();
}
```

### 옵션

| 옵션          | 타입                             | 기본값     | 설명                        |
| ------------- | -------------------------------- | ---------- | --------------------------- |
| `syncOnMount` | `'always' \| 'stale' \| 'never'` | `'always'` | 마운트 시 동기화 전략입니다 |
| `onSuccess`   | `(data: T) => void`              | -          | 동기화 성공 시 콜백입니다   |
| `onError`     | `(error: Error) => void`         | -          | 동기화 실패 시 콜백입니다   |

#### syncOnMount 옵션

- `'always'`: 컴포넌트 마운트 시 항상 서버와 동기화합니다
- `'stale'`: TTL이 지난 경우에만 동기화합니다. 데이터가 신선하면 로컬 캐시를 사용합니다
- `'never'`: 자동 동기화하지 않습니다. `sync()` 호출로만 동기화합니다

### 반환값

useModel의 반환값에 추가로:

| 필드        | 타입                  | 설명                      |
| ----------- | --------------------- | ------------------------- |
| `sync`      | `() => Promise<void>` | 수동 동기화 함수입니다    |
| `isSyncing` | `boolean`             | 동기화 진행 중 여부입니다 |

## useSuspenseSyncedModel

React Suspense와 함께 사용하는 훅입니다. 데이터가 준비될 때까지 컴포넌트 렌더링을 중단합니다.

```typescript
import { Suspense } from 'react';
import { useSuspenseSyncedModel } from '@firsttx/local-first';

function CartList() {
  // 데이터가 있을 때까지 suspend
  const cart = useSuspenseSyncedModel(CartModel, fetchCart, {
    revalidateOnMount: 'stale',
  });

  // cart는 항상 T 타입 (null이 아님)
  return (
    <ul>
      {cart.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}

function CartPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CartList />
    </Suspense>
  );
}
```

### 옵션

| 옵션                | 타입                             | 기본값     | 설명                                               |
| ------------------- | -------------------------------- | ---------- | -------------------------------------------------- |
| `revalidateOnMount` | `'always' \| 'stale' \| 'never'` | `'always'` | 캐시된 데이터 표시 후 백그라운드 재검증 전략입니다 |
| `onSuccess`         | `(data: T) => void`              | -          | 동기화 성공 시 콜백입니다                          |
| `onError`           | `(error: Error) => void`         | -          | 동기화 실패 시 콜백입니다                          |

이 훅은 다음과 같이 동작합니다:

1. 캐시된 데이터가 있으면 즉시 반환합니다
2. `revalidateOnMount` 설정에 따라 백그라운드에서 서버 데이터를 가져옵니다
3. 캐시가 없으면 fetcher를 호출하고 Promise를 throw하여 Suspense를 트리거합니다

## ModelHistory

데이터의 메타정보를 담는 객체입니다.

```typescript
interface ModelHistory {
  updatedAt: number;    // 마지막 업데이트 시간 (Unix timestamp)
  age: number;          // 업데이트 이후 경과 시간 (ms)
  isStale: boolean;     // age > ttl 여부
  isConflicted: boolean; // 충돌 상태 (현재 미구현)
}
```

### 활용 예시

```typescript
function CartStatus() {
  const { history } = useModel(CartModel);

  if (history.isStale) {
    return <span>데이터가 오래되었습니다. 새로고침하세요.</span>;
  }

  const minutes = Math.floor(history.age / 60000);
  return <span>{minutes}분 전 업데이트됨</span>;
}
```

## 탭 간 동기화

Local-First는 BroadcastChannel API를 사용하여 여러 탭 간에 데이터를 실시간으로 동기화합니다.

동작 방식:

1. 한 탭에서 `patch()` 또는 `replace()`가 호출되면 IndexedDB에 저장됩니다
2. 동시에 다른 탭들에 BroadcastChannel로 변경 알림을 보냅니다
3. 알림을 받은 탭들은 IndexedDB에서 최신 데이터를 다시 읽어옵니다
4. React 컴포넌트가 자동으로 리렌더링됩니다

BroadcastChannel을 지원하지 않는 환경(예: 일부 Safari 버전)에서는 자동으로 폴백 모드로 동작합니다. 이 경우 탭 간 실시간 동기화는 되지 않지만, 페이지 새로고침 시 IndexedDB에서 최신 데이터를 읽어옵니다.

## 스토리지

데이터는 IndexedDB의 `firsttx-local-first` 데이터베이스에 저장됩니다.

- 데이터베이스명: `firsttx-local-first`
- 저장소명: `models`
- 키: 모델 이름

### 저장 구조

```typescript
interface StoredModel<T> {
  _v: number;      // 스키마 버전
  updatedAt: number; // 마지막 업데이트 시간
  data: T;         // 실제 데이터
}
```

## 에러 처리

### StorageError

IndexedDB 관련 에러입니다.

```typescript
type StorageErrorCode =
  | 'QUOTA_EXCEEDED'    // 저장소 용량 초과
  | 'PERMISSION_DENIED' // 접근 권한 없음
  | 'UNKNOWN';          // 알 수 없는 에러
```

### ValidationError

Zod 스키마 검증 실패 시 발생합니다.

```typescript
try {
  await CartModel.patch((draft) => {
    draft.items.push({ invalid: 'data' }); // 스키마와 맞지 않음
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('검증 실패:', error.zodError.issues);
  }
}
```

개발 환경에서는 저장된 데이터가 스키마와 맞지 않으면 ValidationError를 throw합니다. 프로덕션에서는 조용히 데이터를 삭제하고 null을 반환합니다.

자세한 에러 타입은 errors.md를 참고하세요.
