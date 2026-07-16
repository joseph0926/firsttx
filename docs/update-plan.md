# FirstTx 업데이트 계획

> 기준일: 2026.07.14
>
> 현재 제품 정의: “CSR 재방문용 visual cache + IndexedDB persistent client cache + optimistic saga”

현재 사용 중인 “SSR-level hydration”, “local-first conflict resolution”, “atomic transaction” 표현은 구현보다 앞서 있습니다. 다음 기능 릴리스 전까지 공개 계약을 실제 구현 수준으로 낮추고, correctness·security 문제를 현재 toolchain에서 먼저 해결한 뒤 major 버전을 독립적으로 업데이트합니다.

## 실행 원칙

- P0 correctness·security와 공개 계약 수정을 major toolchain 업데이트보다 먼저 처리합니다.
- Local-First의 CAS/revision 충돌 해결처럼 새로운 제품 기능은 현재 결함 수정과 분리합니다.
- 공개 API, 기본 동작, wire protocol 변경에는 Changeset과 migration note를 포함합니다.
- 각 major 업데이트는 하나의 독립 변경으로 진행하고 이전 단계의 검증 기준을 그대로 재실행합니다.
- `pnpm`, Vite, TypeScript, ESLint major가 섞인 상태에서 runtime 결함을 수정하지 않습니다.

## Phase 0 — 즉시 공개 계약 정정

코드 변경과 무관하게 먼저 README, package description, docs MDX, AI/RAG source 문서의 표현을 실제 구현에 맞춥니다.

> 상태: 2026.07.14 source 정정 완료. README, package metadata, Playground README, 한국어·영어 docs, 페이지 metadata, 홈 카피, AI source와 RAG system prompt를 같은 계약으로 정렬했습니다. Changelog의 과거 기록과 `HydrationError`·`hydration.error` 같은 현행 API/event 이름은 유지하고, direct-restore hydration 설명에는 legacy 구현임을 표시했습니다. 외부 Redis/Vector namespace를 변경하는 RAG 재색인은 이 문서 변경 범위에 포함하지 않았습니다.

- Prepaint
  - “SSR-level hydration”, “automatic hydration”을 제거합니다.
  - “React 로드 전 마지막 화면을 비상호작용 visual snapshot으로 표시한다”로 설명합니다.
  - “0ms”는 측정 조건이 붙은 결과로만 사용합니다.
- Local-First
  - conflict resolution과 offline-first database 주장을 제거합니다.
  - “IndexedDB-backed persistent client cache with cross-tab invalidation”으로 설명합니다.
  - `isConflicted`는 아직 구현되지 않은 reserved field임을 명시합니다.
- Tx
  - “atomic transaction”을 “optimistic saga with compensating actions”로 수정합니다.
  - 원격 API와 IndexedDB 사이의 원자적 commit을 보장하지 않는다고 명시합니다.

완료 조건:

- README, package description, 한국어·영어 docs, AI source에서 상충하는 표현이 검색되지 않습니다.
- RAG index를 다시 생성하기 전 source 문서가 동일한 계약을 사용합니다.

## Phase 1 — P0 Prepaint 안전한 visual handoff

### 1-A. hydration 경로 제거

현재 `packages/prepaint/src/helpers.ts`는 캡처한 클라이언트 DOM을 `hydrateRoot()`로 연결합니다. React는 client-only HTML에 `hydrateRoot()`를 사용하는 것을 지원하지 않으며, mismatch 시 잘못된 요소에 event handler가 붙을 수 있다고 경고합니다.

근거: [React `hydrateRoot` 공식 문서](https://react.dev/reference/react-dom/client/hydrateRoot)

- 기존 overlay 구현을 기본 복원 경로로 승격합니다.
- 실제 앱은 항상 빈 container에서 `createRoot()`로 시작합니다.
- overlay는 React의 첫 commit이 확인된 후 제거합니다. `root.render()` 호출 직후 제거하지 않습니다.
- snapshot DOM을 container에 직접 삽입하고 hydrate하는 기존 경로는 제거하거나 한 릴리스 동안 명시적인 deprecated experimental 옵션으로만 유지합니다.
- root child 수를 1개로 강제하는 guard를 제거합니다. Fragment와 복수 최상위 노드를 정상적인 React 출력으로 취급합니다.

### 1-B. 저장·복원 보안 정책 — 완료 (2026-07-16)

변경 전 기본 동작은 모든 route의 DOM과 같은 출처 CSS를 최대 7일간 저장했습니다. CRM·대시보드 같은 권장 surface에서 PII가 IndexedDB에 남을 수 있었습니다.

구현 결과는 `firstTx({ policy: { routes, ttlMs, maxSnapshotBytes, includeStyles } })`를 단일 정책 권위로 사용합니다. 경로를 누락하거나 비우면 캡처·복원을 비활성화하고, schema v2 migration과 boot-time prune으로 legacy·비허용·만료·크기 초과 record를 제거합니다. 기본 부트 경로는 self-starting external asset이며, `inline: true`는 CSP hash를 명시적으로 관리하는 경로입니다.

- capture와 boot restore가 하나의 route allowlist 정책을 공유하도록 합니다.
- allowlist 미설정 시 기본적으로 캡처와 복원을 비활성화합니다.
- 민감 route는 명시적 opt-in 없이는 캡처하지도 복원하지도 않습니다.
- 정책 변경 시 기존 비허용 snapshot을 삭제하거나 DB version migration으로 폐기합니다.
- TTL, 최대 snapshot 크기, CSS 저장 여부를 설정 가능하게 합니다.
- `visibilitychange`와 `pagehide` 전에 활성·유휴 시점에 snapshot을 미리 준비합니다.
- `beforeunload` listener를 제거합니다.
- 정적 Vite 출력은 CSP hash 또는 external asset을 사용하고, runtime nonce는 server adapter에서만 지원합니다.
- boot와 overlay의 동기 복원 경로는 built-in fallback sanitizer를 사용하므로 DOMPurify 업데이트와 별개로 threat model과 sanitizer 완료 조건을 검증합니다.

근거:

- [Chrome Page Lifecycle 가이드](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [MDN Content Security Policy 가이드](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP#nonces)

완료 조건:

- 기본 경로에서 `hydrateRoot()`가 호출되지 않습니다.
- Fragment·복수 root child가 강제 unmount/re-render되지 않습니다.
- 느린 JS 환경에서도 overlay가 React 첫 commit 전에 사라지지 않습니다.
- 비허용 route는 새로 저장되지 않고, 기존 record도 복원되거나 남아 있지 않습니다.
- snapshot 크기 초과, TTL 만료, CSS 저장 비활성화가 테스트됩니다.
- `beforeunload` listener가 등록되지 않습니다.
- slow-JS revisit, route switching, legacy snapshot purge를 Playwright로 검증합니다.
- `@firsttx/prepaint` Changeset과 migration note가 포함됩니다.

## Phase 2 — P0 Local-First correctness

### 2-A. falsy generic 값

`false`, `0`, `""`를 데이터 없음으로 취급하는 truthiness 판정을 모두 제거합니다.

확인된 범위:

- `packages/local-first/src/storage-manager.ts`: version과 `initialData`
- `packages/local-first/src/suspense.ts`: snapshot data
- `packages/local-first/src/sync-manager.ts`: cached data와 `initialData`
- `packages/local-first/src/model.ts`: subscription 초기화와 관측 event

값의 존재 여부는 계약에 따라 `data !== null`, `initialData !== undefined`, `version !== undefined`로 판정합니다.

### 2-B. model listener 수명주기

`defineModel()`이 등록한 BroadcastChannel listener의 소유자와 해제 시점을 정의합니다.

- 동일 model을 반복 정의할 때 listener가 누적되지 않아야 합니다.
- 명시적 dispose API를 제공하거나 model registry가 singleton 수명주기를 소유하도록 합니다.
- React subscriber 해제와 BroadcastChannel listener 해제를 별개의 계약으로 테스트합니다.

### 2-C. 범위 제한

- 단기 릴리스에서는 package 설명을 persistent client cache로 낮춥니다.
- record revision/CAS, 충돌 상태, 재시도 정책은 별도 기능 phase로 분리합니다.
- `merge`가 server replace에만 적용되고 multi-tab patch 충돌은 해결하지 않는다는 제약을 문서화합니다.

완료 조건:

- `false`, `0`, `""` 각각에 대해 migration, patch, subscribe, sync, Suspense 회귀 테스트가 통과합니다.
- `version: 0`과 falsy `initialData`가 보존됩니다.
- React 18/19 × Zod 3/4 packed-consumer matrix가 통과합니다.
- docs의 `version` 예제가 실제 `number` 타입을 사용합니다.
- listener 등록·해제 수가 반복 model 생성 후에도 증가하지 않습니다.

## Phase 3 — P1 공개 API와 DevTools 계약

### 3-A. Tx saga와 동시성

Tx 엔진은 완료된 step의 보상 작업을 역순 실행하는 saga로 정의합니다.

- 구현 전 결정 게이트: `useTx`의 기본 동시성 모드를 `single-flight`, `queue`, `latest-wins`, `parallel` 중 하나로 확정합니다. 현재 반환 타입이 단일 `isPending`, `error`, `cancel()`을 제공하므로 기본값은 `single-flight`를 우선 검토합니다.
- `parallel`을 지원하려면 요청별 AbortController, cancel target, pending count, success/error 상태 소유권을 별도로 설계합니다.
- 먼저 끝난 요청이 다른 요청의 controller와 pending 상태를 초기화하지 않아야 합니다.
- 현재 `[3, 3, 3]`을 기대하는 동시성 테스트를 요청 독립성과 종료 순서를 검증하는 테스트로 교체합니다.

완료 조건:

- 선택한 기본 동시성 모드와 `cancel()` 의미가 공개 타입과 문서에 명시됩니다.
- 모든 요청이 끝날 때까지 pending 상태가 정확히 유지됩니다.
- Changeset에 동작 변경과 migration 예제가 포함됩니다.

### 3-B. DevTools protocol

`packages/shared`의 독립 protocol 모듈을 producer·bridge·extension·panel의 source of truth로 사용합니다.

- Tx producer와 DevTools consumer의 필드명을 통일합니다.
- event envelope에 `protocolVersion`을 추가합니다.
- 기존 extension과 producer의 독립 배포를 고려해 이전 protocol adapter를 최소 한 버전 유지합니다.
- 연결 입력을 `unknown`으로 받고 runtime validator를 통과한 event만 처리합니다.
- HIGH event 저장 후 record 수와 무관하게 200개를 삭제하는 cleanup 로직을 최대 보관 개수 기준으로 수정합니다.
- panel command를 background → content → bridge로 전달하고 response를 역방향으로 반환합니다.
- package version, extension manifest version, ready event version의 단일 생성 source를 둡니다.

완료 조건:

- producer → bridge → content → background → panel event 경로가 통합 테스트됩니다.
- panel → background → content → bridge command와 response 경로가 통합 테스트됩니다.
- 빈 DB, 보관 한도 미만, 보관 한도 초과 각각의 cleanup 테스트가 통과합니다.
- 구 protocol fixture가 adapter를 통해 읽히거나 명시적으로 거부됩니다.

### 3-C. 공개 브라우저 패키지 소비 계약

repo와 앱의 개발 런타임은 Node 24를 유지합니다. 공개 브라우저 패키지의 `engines.node >=24`와 ES2024 출력은 실제 소비자 범위와 분리해 판단합니다.

- emitted syntax와 사용 API를 기준으로 target을 정합니다.
- ES2022 target을 채택한다면 `tsconfig`, tsup, declaration build를 함께 정렬합니다.
- Node 최소 버전별 packed-consumer 검증 후 package `engines`를 수정합니다.

## Phase 4 — 독립 버전 업데이트

Phase 1~3의 runtime 계약과 회귀 테스트가 안정된 뒤 아래 순서로 진행합니다. 각 항목은 독립 변경으로 유지합니다.

1. React manifest 정렬
   - lockfile의 React/React DOM 19.2.7과 root override·workspace manifest를 정렬합니다.
   - 설치 그래프가 바뀌지 않는 metadata-only 변경인지 확인합니다.
2. pnpm 11.11.0 → 11.13.0
   - root `packageManager`, 공통 setup action, release workflow, E2E workflow를 함께 수정합니다.
   - frozen lockfile 설치를 다시 검증합니다.
3. Vite 7.3.6 → 8.1.4
   - Prepaint plugin을 Vite 7과 8 packed consumer에서 먼저 검증합니다.
   - 검증 후 peer range와 playground/devtools build tool을 정렬합니다.
4. ESLint 9 → 10
   - flat config, Next config, typescript-eslint 호환성을 독립적으로 검증합니다.
   - 현재 root config의 `MODULE_TYPELESS_PACKAGE_JSON` 경고도 이 단계에서 해소합니다.
5. TypeScript 5.9 → 7
   - 모든 package declaration build와 project reference를 검증합니다.
   - 공개 `.d.ts` diff와 consumer typecheck를 확인합니다.
6. AI SDK 5 → 7, `@ai-sdk/*` 2 → 4
   - docs 앱의 chat route, message conversion, streaming response, RAG script를 별도 migration으로 처리합니다.

다음 업데이트는 완료되었습니다.

- Next.js, eslint-config-next, `@next/mdx` 16.2.10 정렬
- DOMPurify 3.4.12 업데이트
- Turbo 2.10.5 업데이트

DOMPurify 업데이트는 dependency version 정렬 완료만 의미합니다. Prepaint boot-time sanitizer 검증 완료를 의미하지 않습니다.

## Phase 5 — 별도 제품 기능

다음 항목은 현재 update 릴리스의 완료 조건이 아닙니다.

- Local-First record revision/CAS와 실제 conflict state
- multi-tab write retry 또는 merge 정책
- Tx의 여러 동시성 모드 동시 지원
- server adapter의 runtime CSP nonce

각 기능은 공개 계약과 소비자 요구가 확정된 뒤 독립 SPEC과 Changeset으로 진행합니다.

## 공통 검증 게이트

각 phase에서 가장 작은 관련 검증부터 실행하고, 공개 package release 전에는 아래 전체 게이트를 통과해야 합니다.

1. 대상 workspace unit/regression test
2. root `pnpm typecheck`, `pnpm test:run`, `pnpm lint`, `pnpm build`
3. playground 핵심 Playwright E2E
4. 실제 `pnpm pack` artifact를 사용하는 consumer test
5. peer matrix가 있는 package의 버전 조합 테스트
6. package export, declaration, emitted target 확인
7. 변경된 공개 package의 Changeset과 migration note 확인

현재 재검증 상태:

- typecheck: Turbo 11개 task 성공
- test:run: Turbo 9개 task 성공
- lint: Turbo 11개 task 성공
  - playground hook dependency 경고 1건
  - root ESLint config의 module type 경고 발생
- 작업 트리: 검토 시작 시 변경 없이 깨끗함
- 브라우저 E2E와 실제 packed-consumer matrix: 미실행

현재 단위 테스트 통과는 기존 동작이 올바르다는 의미가 아닙니다. root child를 1개로 되돌리는 Prepaint 테스트와 동시 요청 결과 `[3, 3, 3]`을 성공으로 간주하는 Tx 테스트처럼 수정 대상 동작을 현재 계약으로 고정한 사례가 있으므로, 각 phase에서 회귀 테스트의 기대값도 함께 교체합니다.

## 탐색 범위

주요 source, 테스트, package manifest와 lockfile, 공개 문서 계약, CI·release 설정을 직접 확인했습니다. 전체 UI 컴포넌트와 운영 로그는 전수 감사 범위에서 제외했습니다.
