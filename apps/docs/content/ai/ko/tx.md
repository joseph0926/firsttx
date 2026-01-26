# Tx

## Tx란?

Tx는 낙관적 업데이트를 트랜잭션으로 관리하는 라이브러리입니다. 여러 단계의 작업을 하나의 트랜잭션으로 묶고, 실패 시 자동으로 롤백합니다.

주요 특징:

- 단계별 실행과 보상(compensate) 함수로 안전한 롤백을 지원합니다
- 재시도 설정으로 일시적 실패를 자동으로 복구합니다
- 타임아웃으로 무한 대기를 방지합니다
- ViewTransition API로 롤백 시에도 부드러운 UI 전환을 제공합니다

## startTransaction

트랜잭션을 시작합니다.

```typescript
import { startTransaction } from '@firsttx/tx';

const tx = startTransaction();

// 1단계: 로컬 모델 업데이트 (낙관적 업데이트)
await tx.run(
  () => CartModel.patch((draft) => {
    draft.items.push(newItem);
  }),
  {
    compensate: () => CartModel.patch((draft) => {
      draft.items.pop();
    }),
  }
);

// 2단계: 서버 요청
await tx.run(() => fetch('/api/cart', {
  method: 'POST',
  body: JSON.stringify(newItem),
}));

// 커밋
await tx.commit();
```

### TxOptions

startTransaction에 전달할 수 있는 옵션입니다.

| 옵션         | 타입      | 기본값           | 설명                                                                           |
| ------------ | --------- | ---------------- | ------------------------------------------------------------------------------ |
| `id`         | `string`  | 자동 생성 (UUID) | 트랜잭션 식별자입니다. 디버깅에 유용합니다                                     |
| `transition` | `boolean` | `false`          | 롤백 시 ViewTransition API를 사용합니다                                        |
| `timeout`    | `number`  | `30000`          | 전체 트랜잭션 타임아웃(ms)입니다. 초과 시 TransactionTimeoutError가 발생합니다 |

```typescript
const tx = startTransaction({
  id: 'cart-update-123',
  transition: true,
  timeout: 10000, // 10초
});
```

## tx.run

트랜잭션에 단계를 추가하고 실행합니다.

```typescript
const result = await tx.run(
  async (signal) => {
    // signal은 AbortSignal입니다
    const res = await fetch('/api/data', { signal });
    return res.json();
  },
  {
    compensate: async () => {
      // 롤백 시 실행됩니다
    },
    retry: {
      maxAttempts: 3,
      delayMs: 500,
      backoff: 'exponential',
    },
  }
);
```

### StepOptions

| 옵션         | 타입                  | 설명                                                                             |
| ------------ | --------------------- | -------------------------------------------------------------------------------- |
| `compensate` | `() => Promise<void>` | 롤백 시 실행할 함수입니다. 이 단계가 성공한 후 다음 단계에서 실패하면 호출됩니다 |
| `retry`      | `RetryConfig`         | 재시도 설정입니다                                                                |

### AbortSignal

run 함수의 첫 번째 인자로 AbortSignal이 전달됩니다. 타임아웃이나 취소 시 abort됩니다.

```typescript
await tx.run(async (signal) => {
  // fetch에 signal 전달
  const res = await fetch('/api/slow', { signal });

  // 수동으로 취소 확인
  if (signal?.aborted) {
    throw new Error('Cancelled');
  }

  return res.json();
});
```

## tx.commit

트랜잭션을 완료합니다. 모든 단계가 성공한 후 호출해야 합니다.

```typescript
await tx.commit();
```

이미 커밋된 트랜잭션에 commit()을 다시 호출하면 무시됩니다. 롤백되었거나 실패한 트랜잭션에 commit()을 호출하면 TransactionStateError가 발생합니다.

## 롤백 동작

어떤 단계에서 에러가 발생하면 자동으로 롤백이 시작됩니다.

1. 현재 단계의 에러를 감지합니다
2. 이전에 성공한 단계들의 compensate 함수를 역순으로 실행합니다
3. 모든 compensate가 완료되면 원래 에러를 다시 throw합니다

```typescript
const tx = startTransaction();

// 1단계: 성공
await tx.run(
  () => step1(),
  { compensate: () => undoStep1() }
);

// 2단계: 성공
await tx.run(
  () => step2(),
  { compensate: () => undoStep2() }
);

// 3단계: 실패!
await tx.run(() => step3()); // 에러 발생

// 롤백 순서: undoStep2() → undoStep1()
```

### compensate 함수가 실패하면?

compensate 함수 자체가 실패해도 나머지 compensate는 계속 실행됩니다. 모든 compensate 시도 후 CompensationFailedError가 발생합니다.

```typescript
try {
  await tx.run(() => failingStep());
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('롤백 중 에러 발생:', error.failures);
    // 데이터가 불일치 상태일 수 있음
  }
}
```

## 재시도 (Retry)

일시적인 네트워크 오류 등에 대해 자동 재시도를 설정할 수 있습니다.

### RetryConfig

| 옵션          | 타입                        | 기본값          | 설명                                            |
| ------------- | --------------------------- | --------------- | ----------------------------------------------- |
| `maxAttempts` | `number`                    | `1`             | 최대 시도 횟수입니다. 1이면 재시도하지 않습니다 |
| `delayMs`     | `number`                    | `100`           | 재시도 사이 대기 시간(ms)입니다                 |
| `backoff`     | `'linear' \| 'exponential'` | `'exponential'` | 대기 시간 증가 전략입니다                       |

### 백오프 전략

- `linear`: delayMs × 시도 횟수 (100, 200, 300, ...)
- `exponential`: delayMs × 2^(시도-1) (100, 200, 400, 800, ...)

```typescript
await tx.run(
  () => fetch('/api/flaky'),
  {
    retry: {
      maxAttempts: 3,
      delayMs: 500,
      backoff: 'exponential', // 500ms, 1000ms, 2000ms
    },
  }
);
```

### RETRY_PRESETS

자주 사용되는 재시도 설정을 미리 정의해두었습니다.

```typescript
import { RETRY_PRESETS } from '@firsttx/tx';

// default: 2회 시도, 500ms 시작, exponential
await tx.run(fn, { retry: RETRY_PRESETS.default });

// aggressive: 5회 시도, 1000ms 시작, exponential
await tx.run(fn, { retry: RETRY_PRESETS.aggressive });

// quick: 1회 시도(재시도 없음), 0ms
await tx.run(fn, { retry: RETRY_PRESETS.quick });
```

## useTx

React 컴포넌트에서 트랜잭션을 쉽게 사용할 수 있는 훅입니다.

```typescript
import { useTx } from '@firsttx/tx';

function AddToCartButton({ item }) {
  const { mutate, isPending, isError, error } = useTx({
    optimistic: async () => {
      await CartModel.patch((draft) => {
        draft.items.push(item);
      });
    },
    rollback: async () => {
      await CartModel.patch((draft) => {
        draft.items.pop();
      });
    },
    request: async () => {
      const res = await fetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (result) => {
      console.log('추가 완료:', result);
    },
    onError: (error) => {
      console.error('추가 실패:', error);
    },
  });

  return (
    <button onClick={() => mutate(item)} disabled={isPending}>
      {isPending ? '추가 중...' : '장바구니에 추가'}
    </button>
  );
}
```

### UseTxConfig

| 옵션              | 타입                                              | 필수 | 설명                                                         |
| ----------------- | ------------------------------------------------- | ---- | ------------------------------------------------------------ |
| `optimistic`      | `(variables: T) => Promise<S>`                    | O    | 낙관적 업데이트 함수입니다. 반환값은 rollback에 전달됩니다   |
| `rollback`        | `(variables: T, snapshot?: S) => Promise<void>`   | O    | 롤백 함수입니다. optimistic의 반환값을 snapshot으로 받습니다 |
| `request`         | `(variables: T) => Promise<R>`                    | O    | 서버 요청 함수입니다                                         |
| `transition`      | `boolean`                                         | X    | ViewTransition 사용 여부입니다                               |
| `retry`           | `RetryConfig`                                     | X    | request 단계의 재시도 설정입니다                             |
| `onSuccess`       | `(result: R, variables: T, snapshot?: S) => void` | X    | 성공 콜백입니다                                              |
| `onError`         | `(error: Error, variables: T) => void`            | X    | 실패 콜백입니다                                              |
| `cancelOnUnmount` | `boolean`                                         | X    | 컴포넌트 언마운트 시 트랜잭션 취소 여부입니다                |

### 반환값

| 필드          | 타입                           | 설명                            |
| ------------- | ------------------------------ | ------------------------------- |
| `mutate`      | `(variables: T) => void`       | 트랜잭션 실행 (fire-and-forget) |
| `mutateAsync` | `(variables: T) => Promise<R>` | 트랜잭션 실행 (Promise 반환)    |
| `cancel`      | `() => void`                   | 진행 중인 트랜잭션 취소         |
| `isPending`   | `boolean`                      | 트랜잭션 진행 중 여부           |
| `isError`     | `boolean`                      | 에러 발생 여부                  |
| `isSuccess`   | `boolean`                      | 성공 여부                       |
| `error`       | `Error \| null`                | 에러 객체                       |

### snapshot 활용

optimistic 함수의 반환값은 rollback에 전달됩니다. 이전 상태를 저장해두고 롤백에 활용할 수 있습니다.

```typescript
const { mutate } = useTx({
  optimistic: async (newName) => {
    const previousName = user.name;
    await UserModel.patch((draft) => {
      draft.name = newName;
    });
    return previousName; // snapshot으로 전달
  },
  rollback: async (_, previousName) => {
    await UserModel.patch((draft) => {
      draft.name = previousName; // 이전 값으로 복원
    });
  },
  request: (newName) => updateUser(newName),
});
```

## 트랜잭션 상태

트랜잭션은 다음 상태 중 하나입니다:

| 상태          | 설명                                  |
| ------------- | ------------------------------------- |
| `pending`     | 생성 직후. 아직 run()이 호출되지 않음 |
| `running`     | run()이 실행 중                       |
| `committed`   | commit() 완료                         |
| `rolled-back` | 롤백 완료                             |
| `failed`      | compensate 실패로 불일치 상태         |

`running`은 현재 스텝이 실행 중임을 의미합니다. 다음 `run()`은 반드시 이전 스텝 완료( await ) 후에 호출해야 하며,
동시에 호출하면 `TransactionStateError`가 발생합니다.

## 에러 처리

### TransactionTimeoutError

트랜잭션이 timeout을 초과하면 발생합니다.

```typescript
const tx = startTransaction({ timeout: 5000 });

try {
  await tx.run(() => slowOperation());
} catch (error) {
  if (error instanceof TransactionTimeoutError) {
    console.log(`타임아웃: ${error.timeoutMs}ms 초과`);
  }
}
```

### RetryExhaustedError

재시도 횟수를 모두 소진하면 발생합니다.

```typescript
try {
  await tx.run(fn, { retry: { maxAttempts: 3 } });
} catch (error) {
  if (error instanceof RetryExhaustedError) {
    console.log(`${error.attempts}회 시도 후 실패`);
    console.log('각 시도의 에러:', error.errors);
  }
}
```

### CompensationFailedError

롤백 중 compensate 함수가 실패하면 발생합니다. 데이터가 불일치 상태일 수 있으므로 주의가 필요합니다.

```typescript
try {
  await tx.run(fn);
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('롤백 실패! 데이터 불일치 가능');
    console.log('실패한 compensate 수:', error.failures.length);
    // 사용자에게 새로고침 권장
  }
}
```

### TransactionStateError

잘못된 상태에서 작업을 시도하면 발생합니다.

```typescript
const tx = startTransaction();
await tx.run(fn);
await tx.commit();

// 이미 커밋된 트랜잭션에 run 시도
await tx.run(anotherFn); // TransactionStateError
```

자세한 에러 타입은 errors.md를 참고하세요.
