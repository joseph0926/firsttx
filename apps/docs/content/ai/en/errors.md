# Errors

FirstTx uses different base error classes for each package. Errors from each package commonly provide the `getUserMessage()` and `getDebugInfo()` methods.

## Error hierarchy per package

| Package                | Base class      | isRecoverable()                                          |
| ---------------------- | --------------- | -------------------------------------------------------- |
| `@firsttx/prepaint`    | `PrepaintError` | Provided as a method                                     |
| `@firsttx/local-first` | `FirstTxError`  | Not provided (StorageError uses the `recoverable` field) |
| `@firsttx/tx`          | `TxError`       | Provided as a method                                     |

```typescript
// Prepaint error base class
import { PrepaintError } from '@firsttx/prepaint';

abstract class PrepaintError extends Error {
  getUserMessage(): string;
  getDebugInfo(): string;
  isRecoverable(): boolean;
}

// Local-First error base class
import { FirstTxError } from '@firsttx/local-first';

abstract class FirstTxError extends Error {
  getUserMessage(): string;
  getDebugInfo(): string;
  // No isRecoverable() - StorageError uses the recoverable property
}

// Tx error base class
import { TxError } from '@firsttx/tx';

abstract class TxError extends Error {
  getUserMessage(): string;
  getDebugInfo(): string;
  isRecoverable(): boolean;
}
```

## Prepaint errors

Prepaint errors are imported from `@firsttx/prepaint`.

```typescript
import { BootError, CaptureError, HydrationError, PrepaintStorageError } from '@firsttx/prepaint';
```

### BootError

This error occurs when restoring a snapshot fails in the boot script.

| Property | Type                                                                 | Description           |
| -------- | -------------------------------------------------------------------- | --------------------- |
| `phase`  | `'db-open' \| 'snapshot-read' \| 'dom-restore' \| 'style-injection'` | The phase that failed |
| `cause`  | `Error \| undefined`                                                 | Underlying error      |

```typescript
// Meaning of each phase
'db-open'         // Failed to open IndexedDB
'snapshot-read'   // Failed to read snapshot
'dom-restore'     // Failed to restore DOM
'style-injection' // Failed to inject styles
```

- getUserMessage(): `"Page is loading normally. Previous state could not be restored."`
- isRecoverable(): always `true`

BootError occurs before React is loaded, so it cannot be detected via a callback. Debug information is printed to the console.

### CaptureError

This error occurs when snapshot capture fails.

| Property | Type                                               | Description                          |
| -------- | -------------------------------------------------- | ------------------------------------ |
| `phase`  | `'dom-serialize' \| 'style-collect' \| 'db-write'` | The phase that failed                |
| `route`  | `string`                                           | Route that capture was attempted for |
| `cause`  | `Error \| undefined`                               | Underlying error                     |

```typescript
// Meaning of each phase
'dom-serialize' // Failed to serialize DOM (no root element, etc.)
'style-collect' // Failed to collect styles
'db-write'      // Failed to write to IndexedDB
```

- getUserMessage(): `"Snapshot capture failed. Next visit will load normally."`
- isRecoverable(): always `true`

Capture failures do not affect the next visit.

### HydrationError

This error is created when a DOM mismatch occurs during React hydration.

| Property       | Type                                      | Description                    |
| -------------- | ----------------------------------------- | ------------------------------ |
| `mismatchType` | `'content' \| 'structure' \| 'attribute'` | Type of mismatch               |
| `cause`        | `Error`                                   | Original error thrown by React |

```typescript
// Meaning of each mismatchType
'content'   // Text content mismatch
'structure' // DOM structure mismatch (e.g. child count)
'attribute' // Attribute value mismatch
```

- getUserMessage(): `"Page content has been updated. Loading fresh version."`
- isRecoverable(): always `true`

You can detect this via the `onHydrationError` callback. Prepaint automatically falls back to client rendering.

### PrepaintStorageError

This is an IndexedDB-related error in Prepaint.

| Property    | Type                                                                       | Description           |
| ----------- | -------------------------------------------------------------------------- | --------------------- |
| `code`      | `'QUOTA_EXCEEDED' \| 'PERMISSION_DENIED' \| 'CORRUPTED_DATA' \| 'UNKNOWN'` | Error code            |
| `operation` | `'open' \| 'read' \| 'write' \| 'delete'`                                  | Operation that failed |
| `cause`     | `Error \| undefined`                                                       | Underlying error      |

The return value of getUserMessage() depends on `code`:

| code                | getUserMessage()                                                                  |
| ------------------- | --------------------------------------------------------------------------------- |
| `QUOTA_EXCEEDED`    | `"Browser storage is full. Please free up space to enable instant page loading."` |
| `PERMISSION_DENIED` | `"Storage access denied. Prepaint features are disabled."`                        |
| `CORRUPTED_DATA`    | `"Stored snapshot is corrupted. It will be cleared automatically."`               |
| `UNKNOWN`           | `"Storage error occurred. Next visit may load slowly."`                           |

- isRecoverable(): `false` only when `code` is `PERMISSION_DENIED`, and `true` for all other codes

## Local-First errors

Local-First errors are imported from `@firsttx/local-first`.

```typescript
import { StorageError, ValidationError, FirstTxError } from '@firsttx/local-first';
```

### StorageError

This is an IndexedDB-related error in Local-First. Instead of an `isRecoverable()` method, it uses a `recoverable` property.

| Property            | Type                                                   | Description                                                                                                 |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `code`              | `'QUOTA_EXCEEDED' \| 'PERMISSION_DENIED' \| 'UNKNOWN'` | Error code                                                                                                  |
| `recoverable`       | `boolean`                                              | Whether the error is recoverable. `QUOTA_EXCEEDED` and `PERMISSION_DENIED` are `false`; `UNKNOWN` is `true` |
| `context.key`       | `string \| undefined`                                  | Related key                                                                                                 |
| `context.operation` | `'get' \| 'set' \| 'delete' \| 'open'`                 | Operation that failed                                                                                       |

The return value of getUserMessage() depends on `code`:

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
    // Show a message to the user
    alert(error.getUserMessage());

    // Check whether it is recoverable (use recoverable instead of isRecoverable())
    if (error.recoverable) {
      showRetryButton();
    } else {
      showRefreshPrompt();
    }
  }
}
```

### ValidationError

This error occurs when validation against a Zod schema fails.

| Property    | Type         | Description                              |
| ----------- | ------------ | ---------------------------------------- |
| `modelName` | `string`     | Name of the model that failed validation |
| `zodError`  | `z.ZodError` | Zod error object                         |

- getUserMessage(): `"Data validation failed for \"model name\". The stored data may be corrupted or outdated."`

```typescript
try {
  await CartModel.patch((draft) => {
    draft.invalidField = 'value'; // Field not present in the schema
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Model:', error.modelName);
    console.log('Issues:', error.zodError.issues);
  }
}
```

In development, if stored data does not match the schema, a ValidationError is thrown. In production, the data is silently deleted and `null` is returned.

## Tx errors

Tx errors are imported from `@firsttx/tx`.

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

This error occurs when a transaction exceeds the configured timeout.

| Property    | Type     | Description              |
| ----------- | -------- | ------------------------ |
| `timeoutMs` | `number` | Configured timeout (ms)  |
| `elapsedMs` | `number` | Actual elapsed time (ms) |

- getUserMessage(): `"The operation took too long (over {timeoutMs}ms). Please try again."`
- isRecoverable(): `true`

```typescript
try {
  await tx.run(() => slowOperation());
} catch (error) {
  if (error instanceof TransactionTimeoutError) {
    console.log(`Timeout of ${error.timeoutMs}ms exceeded (${error.elapsedMs}ms elapsed)`);
  }
}
```

### RetryExhaustedError

This error occurs when all retry attempts have been exhausted.

| Property   | Type      | Description                       |
| ---------- | --------- | --------------------------------- |
| `stepId`   | `string`  | ID of the step that failed        |
| `attempts` | `number`  | Total number of attempts          |
| `errors`   | `Error[]` | Array of errors from each attempt |

- getUserMessage(): `"The operation failed after {attempts} attempt(s). Please try again later."`
- isRecoverable(): `true`

```typescript
try {
  await tx.run(fn, { retry: { maxAttempts: 3 } });
} catch (error) {
  if (error instanceof RetryExhaustedError) {
    console.log(`Failed after ${error.attempts} attempt(s)`);
    error.errors.forEach((e, i) => {
      console.log(`Attempt ${i + 1}: ${e.message}`);
    });
  }
}
```

### CompensationFailedError

This error occurs when a compensate function fails during rollback.

| Property         | Type      | Description                                   |
| ---------------- | --------- | --------------------------------------------- |
| `failures`       | `Error[]` | Array of errors from failed compensate calls  |
| `completedSteps` | `number`  | Number of steps that had originally succeeded |

- getUserMessage(): `"Failed to undo changes. Your data may be in an inconsistent state. Please refresh the page."`
- isRecoverable(): `false`

```typescript
try {
  await tx.run(() => failingStep());
} catch (error) {
  if (error instanceof CompensationFailedError) {
    console.error('Rollback failed! Data may be inconsistent');
    console.log('Number of failed compensate calls:', error.failures.length);
    console.log('Number of steps that had originally succeeded:', error.completedSteps);
    // Recommend a page refresh to the user
  }
}
```

### TransactionStateError

This error occurs when an operation is attempted in an invalid transaction state.

| Property          | Type     | Description                  |
| ----------------- | -------- | ---------------------------- |
| `currentState`    | `string` | Current transaction state    |
| `attemptedAction` | `string` | Operation that was attempted |
| `transactionId`   | `string` | Transaction ID               |

- getUserMessage(): `"This operation is no longer available. The transaction has already completed or failed."`
- isRecoverable(): `false`

```typescript
const tx = startTransaction();
await tx.commit();

try {
  await tx.run(() => {}); // Transaction has already been committed
} catch (error) {
  if (error instanceof TransactionStateError) {
    console.log(`Cannot perform '${error.attemptedAction}' in state '${error.currentState}'`);
  }
}
```

## Error handling patterns

### Displaying messages to users

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof FirstTxError) {
    // User-friendly message
    toast.error(error.getUserMessage());

    // Detailed information for developers
    console.error(error.getDebugInfo());
  }
}
```

### Handling based on recoverability

Prepaint and Tx errors use an `isRecoverable()` method, while Local-First’s StorageError uses the `recoverable` property.

```typescript
import { PrepaintError } from '@firsttx/prepaint';
import { StorageError } from '@firsttx/local-first';
import { TxError } from '@firsttx/tx';

try {
  await someOperation();
} catch (error) {
  // Prepaint or Tx error: use isRecoverable()
  if (error instanceof PrepaintError || error instanceof TxError) {
    if (error.isRecoverable()) {
      showRetryButton();
    } else {
      showRefreshPrompt();
    }
  }

  // Local-First StorageError: use the recoverable property
  if (error instanceof StorageError) {
    if (error.recoverable) {
      showRetryButton();
    } else {
      showRefreshPrompt();
    }
  }
}
```

### Branching by error type

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
