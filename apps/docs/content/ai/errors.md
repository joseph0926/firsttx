# Errors

FirstTx는 패키지별로 에러 기반 클래스가 다릅니다. 각 패키지의 에러는 공통적으로 `getUserMessage()`와 `getDebugInfo()` 메서드를 제공합니다.

## 패키지별 에러 계층 구조

| 패키지                 | 기반 클래스     | isRecoverable()                               |
| ---------------------- | --------------- | --------------------------------------------- |
| `@firsttx/prepaint`    | `PrepaintError` | 메서드로 제공                                 |
| `@firsttx/local-first` | `FirstTxError`  | 없음 (StorageError는 `recoverable` 속성 사용) |
| `@firsttx/tx`          | `TxError`       | 메서드로 제공                                 |

```typescript
// Prepaint 에러 기반 클래스
import { PrepaintError } from '@firsttx/prepaint';

abstract class PrepaintError extends Error {
  getUserMessage(): string;
  getDebugInfo(): string;
  isRecoverable(): boolean;
}

// Local-First 에러 기반 클래스
import { FirstTxError } from '@firsttx/local-first';

abstract class FirstTxError extends Error {
  getUserMessage(): string;
  getDebugInfo(): string;
  // isRecoverable() 없음 - StorageError는 recoverable 속성 사용
}

// Tx 에러 기반 클래스
import { TxError } from '@firsttx/tx';

abstract class TxError extends Error {
  getUserMessage(): string;
  getDebugInfo(): string;
  isRecoverable(): boolean;
}
```

## Prepaint 에러

Prepaint 에러는 `@firsttx/prepaint`에서 import합니다.

```typescript
import { BootError, CaptureError, HydrationError, PrepaintStorageError } from '@firsttx/prepaint';
```

### BootError

부트 스크립트에서 스냅샷 복원 실패 시 발생합니다.

| 속성    | 타입                                                                 | 설명        |
| ------- | -------------------------------------------------------------------- | ----------- |
| `phase` | `'db-open' \| 'snapshot-read' \| 'dom-restore' \| 'style-injection'` | 실패한 단계 |
| `cause` | `Error \| undefined`                                                 | 원인 에러   |

```typescript
// phase별 의미
'db-open'         // IndexedDB 열기 실패
'snapshot-read'   // 스냅샷 읽기 실패
'dom-restore'     // DOM 복원 실패
'style-injection' // 스타일 주입 실패
```

- getUserMessage(): `"Page is loading normally. Previous state could not be restored."`
- isRecoverable(): 항상 `true`

BootError는 React 로드 전에 발생하므로 콜백으로 감지할 수 없습니다. 콘솔에 디버그 정보가 출력됩니다.

### CaptureError

스냅샷 캡처 실패 시 발생합니다.

| 속성    | 타입                                               | 설명             |
| ------- | -------------------------------------------------- | ---------------- |
| `phase` | `'dom-serialize' \| 'style-collect' \| 'db-write'` | 실패한 단계      |
| `route` | `string`                                           | 캡처 시도한 경로 |
| `cause` | `Error \| undefined`                               | 원인 에러        |

```typescript
// phase별 의미
'dom-serialize' // DOM 직렬화 실패 (root 요소 없음 등)
'style-collect' // 스타일 수집 실패
'db-write'      // IndexedDB 저장 실패
```

- getUserMessage(): `"Snapshot capture failed. Next visit will load normally."`
- isRecoverable(): 항상 `true`

캡처 실패는 다음 방문에 영향을 주지 않습니다.

### HydrationError

React 하이드레이션 중 DOM 불일치 발생 시 생성됩니다.

| 속성           | 타입                                      | 설명                       |
| -------------- | ----------------------------------------- | -------------------------- |
| `mismatchType` | `'content' \| 'structure' \| 'attribute'` | 불일치 유형                |
| `cause`        | `Error`                                   | React가 발생시킨 원본 에러 |

```typescript
// mismatchType별 의미
'content'   // 텍스트 내용 불일치
'structure' // DOM 구조 불일치 (자식 요소 개수 등)
'attribute' // 속성 값 불일치
```

- getUserMessage(): `"Page content has been updated. Loading fresh version."`
- isRecoverable(): 항상 `true`

`onHydrationError` 콜백으로 감지할 수 있습니다. Prepaint는 자동으로 클라이언트 렌더링으로 폴백합니다.

### PrepaintStorageError

Prepaint의 IndexedDB 관련 에러입니다.

| 속성        | 타입                                                                       | 설명        |
| ----------- | -------------------------------------------------------------------------- | ----------- |
| `code`      | `'QUOTA_EXCEEDED' \| 'PERMISSION_DENIED' \| 'CORRUPTED_DATA' \| 'UNKNOWN'` | 에러 코드   |
| `operation` | `'open' \| 'read' \| 'write' \| 'delete'`                                  | 실패한 작업 |
| `cause`     | `Error \| undefined`                                                       | 원인 에러   |

getUserMessage()는 code에 따라 다릅니다:

| code                | getUserMessage()                                                                  |
| ------------------- | --------------------------------------------------------------------------------- |
| `QUOTA_EXCEEDED`    | `"Browser storage is full. Please free up space to enable instant page loading."` |
| `PERMISSION_DENIED` | `"Storage access denied. Prepaint features are disabled."`                        |
| `CORRUPTED_DATA`    | `"Stored snapshot is corrupted. It will be cleared automatically."`               |
| `UNKNOWN`           | `"Storage error occurred. Next visit may load slowly."`                           |

- isRecoverable(): `PERMISSION_DENIED`일 때만 `false`, 나머지는 `true`

## Local-First 에러

Local-First 에러는 `@firsttx/local-first`에서 import합니다.

```typescript
import { StorageError, ValidationError, FirstTxError } from '@firsttx/local-first';
```

### StorageError

Local-First의 IndexedDB 관련 에러입니다. `isRecoverable()` 메서드 대신 `recoverable` 속성을 사용합니다.

| 속성                | 타입                                                   | 설명                                                                                 |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `code`              | `'QUOTA_EXCEEDED' \| 'PERMISSION_DENIED' \| 'UNKNOWN'` | 에러 코드                                                                            |
| `recoverable`       | `boolean`                                              | 복구 가능 여부. `QUOTA_EXCEEDED`와 `PERMISSION_DENIED`는 `false`, `UNKNOWN`은 `true` |
| `context.key`       | `string \| undefined`                                  | 관련 키                                                                              |
| `context.operation` | `'get' \| 'set' \| 'delete' \| 'open'`                 | 실패한 작업                                                                          |

getUserMessage()는 code에 따라 다릅니다:

| code                | getUserMessage()                                                           |
| ------------------- | -------------------------------------------------------------------------- |
| `QUOTA_EXCEEDED`    | `"Storage quota exceeded. Please free up space in your browser settings."` |
| `PERMISSION_DENIED` | `"Storage access denied. Please check your browser permissions."`          |
| `UNKNOWN`           | `"Failed to access storage. Please try again."`                            |

```typescript
try {
  await CartModel.patch((draft) => { ... });
} catch (error) {
  if (error instanceof StorageError) {
    // 사용자에게 메시지 표시
    alert(error.getUserMessage());

    // 복구 가능 여부 확인 (isRecoverable() 대신 recoverable 속성 사용)
    if (error.recoverable) {
      showRetryButton();
    } else {
      showRefreshPrompt();
    }
  }
}
```

### ValidationError

Zod 스키마 검증 실패 시 발생합니다.

| 속성        | 타입         | 설명                  |
| ----------- | ------------ | --------------------- |
| `modelName` | `string`     | 검증 실패한 모델 이름 |
| `zodError`  | `z.ZodError` | Zod 에러 객체         |

- getUserMessage(): `"Data validation failed for \"모델명\". The stored data may be corrupted or outdated."`

```typescript
try {
  await CartModel.patch((draft) => {
    draft.invalidField = 'value'; // 스키마에 없는 필드
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('모델:', error.modelName);
    console.log('이슈:', error.zodError.issues);
  }
}
```

개발 환경에서는 저장된 데이터가 스키마와 맞지 않으면 ValidationError를 throw합니다. 프로덕션에서는 조용히 데이터를 삭제하고 null을 반환합니다.

## Tx 에러

Tx 에러는 `@firsttx/tx`에서 import합니다.

```typescript
import {
  TransactionTimeoutError,
  RetryExhaustedError,
  CompensationFailedError,
  TransactionStateError,
  TxError
} from '@firsttx/tx';
```

### TransactionTimeoutError

트랜잭션이 timeout을 초과하면 발생합니다.

| 속성        | 타입     | 설명            |
| ----------- | -------- | --------------- |
| `timeoutMs` | `number` | 설정된 타임아웃 |
| `elapsedMs` | `number` | 실제 경과 시간  |

- getUserMessage(): `"The operation took too long (over {timeoutMs}ms). Please try again."`
- isRecoverable(): `true`

```typescript
try {
  await tx.run(() => slowOperation());
} catch (error) {
  if (error instanceof TransactionTimeoutError) {
    console.log(`${error.timeoutMs}ms 타임아웃 초과 (${error.elapsedMs}ms 경과)`);
  }
}
```

### RetryExhaustedError

재시도 횟수를 모두 소진하면 발생합니다.

| 속성       | 타입      | 설명                         |
| ---------- | --------- | ---------------------------- |
| `stepId`   | `string`  | 실패한 단계 ID               |
| `attempts` | `number`  | 총 시도 횟수                 |
| `errors`   | `Error[]` | 각 시도에서 발생한 에러 배열 |

- getUserMessage(): `"The operation failed after {attempts} attempt(s). Please try again later."`
- isRecoverable(): `true`

```typescript
try {
  await tx.run(fn, { retry: { maxAttempts: 3 } });
} catch (error) {
  if (error instanceof RetryExhaustedError) {
    console.log(`${error.attempts}회 시도 후 실패`);
    error.errors.forEach((e, i) => {
      console.log(`시도 ${i + 1}: ${e.message}`);
    });
  }
}
```

### CompensationFailedError

롤백 중 compensate 함수가 실패하면 발생합니다.

| 속성             | 타입      | 설명                        |
| ---------------- | --------- | --------------------------- |
| `failures`       | `Error[]` | 실패한 compensate 에러 배열 |
| `completedSteps` | `number`  | 성공했던 단계 수            |

- getUserMessage(): `"Failed to undo changes. Your data may be in an inconsistent state. Please refresh the page."`
- isRecoverable(): `false`

```typescript
try {
  await tx.run(() => failingStep());
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('롤백 실패! 데이터 불일치 가능');
    console.log('실패한 compensate:', error.failures.length);
    console.log('원래 성공했던 단계:', error.completedSteps);
    // 사용자에게 새로고침 권장
  }
}
```

### TransactionStateError

잘못된 상태에서 작업을 시도하면 발생합니다.

| 속성              | 타입     | 설명               |
| ----------------- | -------- | ------------------ |
| `currentState`    | `string` | 현재 트랜잭션 상태 |
| `attemptedAction` | `string` | 시도한 작업        |
| `transactionId`   | `string` | 트랜잭션 ID        |

- getUserMessage(): `"This operation is no longer available. The transaction has already completed or failed."`
- isRecoverable(): `false`

```typescript
const tx = startTransaction();
await tx.commit();

try {
  await tx.run(() => {}); // 이미 커밋된 트랜잭션
} catch (error) {
  if (error instanceof TransactionStateError) {
    console.log(`상태 '${error.currentState}'에서 '${error.attemptedAction}' 불가`);
  }
}
```

## 에러 처리 패턴

### 사용자 메시지 표시

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof FirstTxError) {
    // 사용자에게 친화적인 메시지
    toast.error(error.getUserMessage());

    // 개발자 콘솔에 상세 정보
    console.error(error.getDebugInfo());
  }
}
```

### 복구 가능 여부에 따른 처리

Prepaint와 Tx 에러는 `isRecoverable()` 메서드를, Local-First의 StorageError는 `recoverable` 속성을 사용합니다.

```typescript
import { PrepaintError } from '@firsttx/prepaint';
import { StorageError } from '@firsttx/local-first';
import { TxError } from '@firsttx/tx';

try {
  await someOperation();
} catch (error) {
  // Prepaint 또는 Tx 에러: isRecoverable() 메서드 사용
  if (error instanceof PrepaintError || error instanceof TxError) {
    if (error.isRecoverable()) {
      showRetryButton();
    } else {
      showRefreshPrompt();
    }
  }

  // Local-First StorageError: recoverable 속성 사용
  if (error instanceof StorageError) {
    if (error.recoverable) {
      showRetryButton();
    } else {
      showRefreshPrompt();
    }
  }
}
```

### 에러 타입별 분기

```typescript
import {
  StorageError,
  ValidationError
} from '@firsttx/local-first';
import {
  TransactionTimeoutError,
  CompensationFailedError
} from '@firsttx/tx';

try {
  await complexOperation();
} catch (error) {
  if (error instanceof StorageError) {
    if (error.code === 'QUOTA_EXCEEDED') {
      promptClearStorage();
    }
  } else if (error instanceof ValidationError) {
    logValidationIssue(error.zodError);
  } else if (error instanceof TransactionTimeoutError) {
    suggestRetry();
  } else if (error instanceof CompensationFailedError) {
    forcePageRefresh();
  }
}
```
