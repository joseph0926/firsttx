# Prepaint

## Prepaint란?

Prepaint는 CSR React 앱 재방문의 빈 화면 시간을 줄입니다. DOM snapshot을 IndexedDB에 저장하고 다음 방문 시 메인 React 번들보다 먼저 임시 비상호작용 visual cache로 표시할 수 있습니다. 시간은 기기, snapshot 크기, storage 상태에 따라 달라집니다.

## 동작 원리

### 캡처 단계

유휴 시점과 `visibilitychange` 또는 `pagehide` 마지막 시점에 다음 작업이 수행됩니다:

1. `#root` 요소의 첫 번째 자식 DOM을 복제합니다
2. `data-firsttx-volatile` 속성이 있는 요소의 내용을 비웁니다
3. 비밀번호 필드와 `data-firsttx-sensitive` 요소의 값을 제거합니다
4. 인라인 이벤트 핸들러(onclick, onload 등)를 제거합니다
5. 현재 페이지의 스타일시트를 수집합니다
6. IndexedDB에 스냅샷을 저장합니다

### 복원 단계

재방문 시 Vite 플러그인이 주입한 부트 스크립트가 실행됩니다:

1. IndexedDB에서 현재 경로의 스냅샷을 조회합니다
2. 스냅샷이 있고 7일 이내라면 비상호작용 Shadow DOM overlay에 즉시 표시합니다
3. 저장된 스타일을 overlay에 적용하고 `#root`는 건드리지 않습니다
4. React 번들 로드를 기다립니다
5. React는 빈 root에 `createRoot()`로 마운트됩니다
6. 첫 React commit이 확인된 뒤 visual overlay를 제거합니다

## createFirstTxRoot

React 앱의 진입점에서 root API를 직접 호출하는 대신 createFirstTxRoot를 사용합니다. 이 함수는 snapshot 캡처, 핸드오프, clean React 마운트를 연결합니다.

```typescript
import { createFirstTxRoot } from '@firsttx/prepaint';
import { App } from './App';

createFirstTxRoot(
  document.getElementById('root')!,
  <App />
);
```

### 옵션

세 번째 인자로 옵션 객체를 전달할 수 있습니다.

```typescript
createFirstTxRoot(
  document.getElementById('root')!,
  <App />,
  {
    transition: true,
    onCapture: (snapshot) => console.log('Captured:', snapshot.route),
    onHandoff: (strategy) => console.log('Strategy:', strategy),
  }
);
```

| 옵션         | 타입                                  | 기본값 | 설명                                                                              |
| ------------ | ------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `transition` | `boolean`                             | `true` | ViewTransition API 사용 여부입니다                                                |
| `onCapture`  | `(snapshot: Snapshot) => void`        | -      | 스냅샷 캡처 완료 시 호출됩니다                                                    |
| `onHandoff`  | `(strategy: HandoffStrategy) => void` | -      | 핸드오프 전략 결정 시 호출됩니다. 값은 `'has-prepaint'` 또는 `'cold-start'`입니다 |

## Vite 플러그인

vite.config.ts에 플러그인을 추가합니다.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    react(),
    firstTx({
      policy: { routes: ['/dashboard', '/cart'] },
    }),
  ],
});
```

정책은 캡처·복원·정리가 공유하는 정확한 pathname allowlist입니다. 누락하거나 비우면 Prepaint가 비활성화됩니다. 기본값은 TTL 7일, UTF-8 payload 최대 1 MiB, CSS 포함입니다. 부트 스크립트는 기본적으로 외부 `/firsttx-boot.js` 자산이며, `inline: true`는 CSP hash를 의도적으로 관리할 때 사용합니다.

복원 HTML은 sanitize하지만 저장 CSS는 시각 캐시일 뿐 범용 CSS sanitization 경계가 아닙니다. 사용자 제어 또는 민감 CSS가 있는 route에서는 `includeStyles: false`를 사용하세요.

### 플러그인 옵션

| 옵션              | 타입                                                   | 기본값              | 설명                                                                                                      |
| ----------------- | ------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| `inline`          | `boolean`                                              | `false`             | CSP hash 배포를 위해 부트 스크립트를 HTML에 인라인으로 삽입합니다                                         |
| `policy`          | `PrepaintPolicy`                                       | 비활성화            | 정확한 route와 선택 TTL, byte 제한, CSS 저장 설정입니다                                                   |
| `minify`          | `boolean`                                              | 프로덕션에서 `true` | 부트 스크립트 minify 여부입니다. 개발 환경에서는 기본 `false`입니다                                       |
| `injectTo`        | `'head' \| 'head-prepend' \| 'body' \| 'body-prepend'` | `'head-prepend'`    | 스크립트 삽입 위치입니다                                                                                  |
| `nonce`           | `string \| (() => string)`                             | -                   | Vite가 결과물을 생성할 때 포함하는 CSP nonce입니다. 정적 출력은 HTTP 응답마다 새 nonce를 만들 수 없습니다 |
| `devFlagOverride` | `boolean`                                              | -                   | 개발 모드 플래그를 수동으로 설정합니다. 설정하지 않으면 Vite의 mode를 따릅니다                            |

## 민감 데이터 처리

### 기본 동작

비밀번호 입력 필드(`input[type="password"]`)와 `data-firsttx-sensitive` 속성이 있는 요소는 스냅샷에서 값이 자동으로 제거됩니다.

그 밖의 DOM 내용은 IndexedDB에 최대 7일간 남을 수 있습니다. 민감하지 않은 route에서만 캡처를 활성화하고 모든 민감 필드를 명시적으로 표시하세요.

### 커스텀 선택자 추가

전역 변수를 통해 추가 선택자를 지정할 수 있습니다:

```typescript
window.__FIRSTTX_SENSITIVE_SELECTORS__ = [
  '.credit-card-input',
  '[data-private]',
];
```

### 휘발성 콘텐츠

실시간 데이터처럼 스냅샷에 저장하면 안 되는 콘텐츠는 `data-firsttx-volatile` 속성을 사용합니다:

```tsx
<div data-firsttx-volatile>
  <span>현재 접속자: {onlineCount}명</span>
</div>
```

이 요소의 내용은 스냅샷에서 비워지며, React 앱 마운트 후 실제 값으로 채워집니다.

기존 `overlay`, `overlayRoutes` 옵션은 한 릴리스 동안 deprecated no-op으로 허용됩니다.

## Visual overlay

스냅샷은 항상 `#root` 밖의 비상호작용 Shadow DOM overlay에 표시됩니다. 별도 활성화 설정은 필요하지 않습니다.

이전 설정 값은 삭제할 수 있습니다:

```typescript
localStorage.removeItem('firsttx:overlay');
localStorage.removeItem('firsttx:overlayRoutes');
```

복원 중에는 `data-prepaint-overlay="true"` 속성이 `<html>` 요소에 추가되고, 첫 React commit 뒤 제거됩니다.

## 커스텀 라우트 키

기본적으로 `window.location.pathname`을 스냅샷 키로 사용합니다. 동적 라우팅을 사용하는 경우 커스텀 키를 지정할 수 있습니다:

```typescript
// 문자열로 지정
window.__FIRSTTX_ROUTE_KEY__ = '/products/detail';

// 함수로 지정 (동적 계산)
window.__FIRSTTX_ROUTE_KEY__ = () => {
  const path = window.location.pathname;
  // /products/123 -> /products/:id
  return path.replace(/\/products\/\d+/, '/products/:id');
};
```

## 스냅샷 저장소

스냅샷은 IndexedDB의 `firsttx-prepaint` 데이터베이스에 저장됩니다.

- 데이터베이스명: `firsttx-prepaint`
- 저장소명: `snapshots`
- 키: 라우트 경로
- 만료 기간: 7일

### 스냅샷 구조

```typescript
interface Snapshot {
  route: string;      // 페이지 경로
  body: string;       // 직렬화된 DOM HTML
  timestamp: number;  // 캡처 시간 (Unix timestamp)
  styles?: Array<{    // 스타일 정보
    type: 'inline' | 'external';
    content?: string;
    href?: string;
  }>;
}
```

## 핸드오프 전략

createFirstTxRoot는 스냅샷 복원 여부에 따라 두 가지 전략 중 하나를 선택합니다:

- `has-prepaint`: visual overlay가 복원된 상태. React는 빈 root에 `createRoot()`로 마운트됩니다.
- `cold-start`: 스냅샷이 없거나 만료된 상태. 동일하게 `createRoot()`로 렌더링합니다.

`onHandoff` 콜백으로 어떤 전략이 선택되었는지 확인할 수 있습니다.

## HTML 속성

Prepaint는 상태를 나타내는 HTML 속성을 `<html>` 요소에 추가합니다:

| 속성                      | 설명                                    |
| ------------------------- | --------------------------------------- |
| `data-prepaint`           | 스냅샷이 복원되었음을 나타냅니다        |
| `data-prepaint-timestamp` | 스냅샷 캡처 시간 (Unix timestamp)       |
| `data-prepaint-overlay`   | 오버레이 모드로 복원되었음을 나타냅니다 |

이 속성들은 React 마운트 후 자동으로 제거됩니다. CSS에서 스냅샷 상태에 따른 스타일링에 활용할 수 있습니다:

```css
/* 스냅샷 복원 중에만 표시되는 로딩 인디케이터 */
html[data-prepaint] .loading-indicator {
  display: block;
}
```

## 브라우저 지원

Prepaint는 다음 API를 사용합니다:

- IndexedDB: 스냅샷 저장
- ViewTransition API (선택): 부드러운 전환 효과

ViewTransition API를 지원하지 않는 브라우저에서도 기본 기능은 정상 동작합니다. 전환 효과만 생략됩니다.

## 에러 처리

Prepaint는 boot와 capture 에러를 잡고 일반 client render를 계속 시도합니다. 실패는 callback과 DevTools event로 관측할 수 있습니다.

### BootError

부트 스크립트에서 스냅샷 복원 실패 시 발생합니다. React 로드 전에 발생하므로 콜백으로 감지할 수 없습니다. 콘솔에 디버그 정보가 출력됩니다.

### HydrationError

legacy 소비자 호환을 위해 export가 유지되는 deprecated 에러 타입입니다. 현재 restore/handoff 경로에서는 생성되지 않습니다.

### CaptureError

스냅샷 캡처 실패 시 발생합니다. 다음 방문에 영향을 주지 않습니다.

### PrepaintStorageError

IndexedDB 관련 에러입니다. 스토리지 용량 초과, 권한 거부 등이 포함됩니다.

자세한 에러 타입은 errors.md를 참고하세요.
