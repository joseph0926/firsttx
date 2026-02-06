# 테스트 커버리지 갭 분석

> 감사일: 2026-02-06 | 대상: 전체 모노레포

## 전체 평가

shared 패키지는 우수한 커버리지. prepaint/tx는 주요 모듈은 테스트되나 유틸/에러 클래스 부분적 누락. local-first는 핵심 매니저 클래스 3개가 직접 테스트 전무. devtools는 bridge helpers와 filter 외 대부분 미테스트.

---

## 패키지별 상세

### @firsttx/prepaint

| 소스 모듈      | 테스트                                       | 상태     |
| -------------- | -------------------------------------------- | -------- |
| boot.ts        | boot.test.ts                                 | 양호     |
| capture.ts     | capture.test.ts                              | 양호     |
| handoff.ts     | handoff.test.ts                              | 양호     |
| overlay.ts     | overlay.test.ts                              | 부분적   |
| sanitize.ts    | sanitize.test.ts                             | 우수     |
| utils.ts       | utils.test.ts                                | 부분적   |
| helpers.ts     | hydration.test.tsx, hydration-error.test.tsx | 양호     |
| devtools.ts    | devtools.test.ts                             | 우수     |
| errors.ts      | hydration-error.test.tsx (부분)              | 부분적   |
| style-utils.ts | (없음)                                       | 미테스트 |
| plugin/vite.ts | vite-plugin.test.ts                          | 우수     |

**누락된 테스트:**

- **[Medium] style-utils.ts** — `normalizeSnapshotStyleEntry()` 직접 테스트 없음. 빈 문자열, undefined href 등 엣지 케이스 누락
- **[Medium] overlay.ts** — `removeOverlay()` 직접 테스트 없음. document.body 없을 때 deferred mount 경로 미테스트
- **[Medium] utils.ts** — `resolveRouteKey()`, `scrubSensitiveFields()` 등 직접 테스트 없음. `__FIRSTTX_ROUTE_KEY__` 함수 오버라이드 엣지 케이스 미테스트
- **[Medium] boot.ts** — `appendStyleResource()` external link style 경로 직접 테스트 없음
- **[Low] errors.ts** — BootError, CaptureError, PrepaintStorageError 직접 테스트 없음. `convertDOMException()` SecurityError/UNKNOWN 분기 미테스트

---

### @firsttx/local-first

| 소스 모듈          | 테스트                                    | 상태     |
| ------------------ | ----------------------------------------- | -------- |
| model.ts           | model.test.ts, model-ttl-optional.test.ts | 양호     |
| hooks.ts           | hooks.test.ts                             | 양호     |
| storage.ts         | storage.test.ts                           | 양호     |
| broadcast.ts       | broadcast.test.ts                         | 양호     |
| suspense.ts        | suspense.test.tsx                         | 양호     |
| errors.ts          | errors.test.ts                            | 양호     |
| cache-manager.ts   | (없음)                                    | 미테스트 |
| storage-manager.ts | (없음)                                    | 미테스트 |
| sync-manager.ts    | (없음)                                    | 미테스트 |
| devtools.ts        | (없음)                                    | 미테스트 |
| utils.ts           | (없음)                                    | 미테스트 |

**누락된 테스트:**

- **[Critical] cache-manager.ts** — 핵심 상태 관리. subscriber count, snapshot 참조 동등성 최적화, TTL 기반 isStale 계산 직접 검증 필요
- **[Critical] sync-manager.ts** — `getSyncPromise` dedupe, `revalidateInBackground`, `replace` merge, `patch` validation, 작업 큐 직렬화 직접 검증 필요
- **[Critical] storage-manager.ts** — load 버전 마이그레이션, Zod 실패 시 삭제, production vs dev 에러 처리 분기, `enqueue` 직렬화 직접 검증 필요
- **[High] devtools.ts** — `emitModelEvent()` 안전성. window 미정의, DevTools API 미존재, emit 에러 시 분기
- **[Low] utils.ts** — `supportsViewTransition()` 직접 테스트 없음

---

### @firsttx/tx

| 소스 모듈      | 테스트              | 상태   |
| -------------- | ------------------- | ------ |
| transaction.ts | transaction.test.ts | 양호   |
| hooks.ts       | hooks.test.ts       | 양호   |
| retry.ts       | retry.test.ts       | 양호   |
| utils.ts       | utils.test.ts       | 양호   |
| errors.ts      | (간접)              | 부분적 |
| devtools.ts    | devtools.test.ts    | 양호   |

**누락된 테스트:**

- **[Medium] errors.ts** — 각 에러 클래스 직접 테스트 없음. `getUserMessage()`, `getDebugInfo()`, `isRecoverable()`, `toJSON()` 직접 검증 부족
- **[Medium] transaction.ts** — `AbortSignal` 연동, `createTimeoutPromise` 엣지 케이스, concurrent step 방지 `isStepRunning` 엣지 케이스

---

### @firsttx/shared

| 소스 모듈      | 테스트              | 상태 |
| -------------- | ------------------- | ---- |
| browser.ts     | browser.test.ts     | 우수 |
| constants.ts   | constants.test.ts   | 양호 |
| errors.ts      | errors.test.ts      | 양호 |
| type-guards.ts | type-guards.test.ts | 우수 |

주요 갭 없음.

---

### @firsttx/devtools

| 소스 모듈                     | 테스트                     | 상태     |
| ----------------------------- | -------------------------- | -------- |
| bridge/helpers.ts             | bridge/helpers.test.ts     | 양호     |
| bridge/core.ts                | (없음)                     | 미테스트 |
| panel/utils/filter.ts         | panel/utils/filter.test.ts | 양호     |
| panel/utils/timeline.ts       | (없음)                     | 미테스트 |
| panel/utils/timeline-scale.ts | (없음)                     | 미테스트 |
| panel/components/\* (7개)     | (없음)                     | 미테스트 |
| panel/App.tsx                 | (없음)                     | 미테스트 |
| extension/\* (4개)            | (없음)                     | 미테스트 |

**누락된 테스트:**

- **[Critical] bridge/core.ts** — DevToolsBridgeImpl 이벤트 버퍼링, BroadcastChannel 통신, 고우선순위 IndexedDB 영속화, 배치 전송
- **[High] panel/utils/timeline.ts** — `groupTxEvents()` 함수
- **[High] panel/utils/timeline-scale.ts** — `calculateTimelineScale()` 함수
- **[Medium] panel/components/\*** — React 컴포넌트 (Chrome DevTools 확장이라 브라우저 테스트 필요)
- **[Low] extension/\*** — Chrome Extension 스크립트

---

### Playground E2E (Playwright)

| E2E 테스트                       | 시나리오                  |
| -------------------------------- | ------------------------- |
| home.smoke.spec.ts               | 기본 라우팅, 투어 스킵    |
| prepaint-heavy.spec.ts           | 대용량 prepaint           |
| prepaint-route-switching.spec.ts | 라우트 전환 시 스냅샷     |
| instant-cart.metrics.spec.ts     | 카트 인스턴트 로딩 메트릭 |
| tx-rollback.spec.ts              | 트랜잭션 롤백 체인        |
| tx-concurrent.metrics.spec.ts    | 동시 트랜잭션 메트릭      |
| tx-network-chaos.spec.ts         | 네트워크 불안정           |
| sync-staleness.spec.ts           | 동기화 + staleness        |

**누락된 E2E:**

- **[Medium]** 오프라인/IndexedDB 비가용 시나리오
- **[Medium]** 크로스탭 동기화 (BroadcastChannel)
- **[Low]** 스냅샷 TTL 만료 후 cold-start 폴백

---

### 통합 테스트

- **[High]** 패키지 간 통합 테스트 전무. prepaint + local-first, tx + local-first 연동 시나리오가 E2E에서만 간접 테스트
- **[Medium]** devtools bridge ↔ 각 패키지 emit 함수 연동 통합 테스트 없음

---

### 모킹 적절성

- **prepaint/capture.test.ts**: `openDB` in-memory 모킹 — 적절
- **prepaint/boot.test.ts**: 실제 fake-indexeddb — 우수
- **tx/retry.test.ts**: `vi.useFakeTimers()` + devtools 모킹 — 적절
- **tx/hooks.test.ts**: `startViewTransition` 모킹 — 적절
- **vite-plugin.test.ts**: esbuild 모킹 — 적절
- **전반**: 과도한 모킹 없음. fake-indexeddb로 실제 동작에 가까운 테스트 수행

---

## 우선 권장 테스트 추가 목록

### P0 (Critical)

1. `packages/local-first/tests/cache-manager.test.ts`
2. `packages/local-first/tests/sync-manager.test.ts`
3. `packages/local-first/tests/storage-manager.test.ts`
4. `packages/devtools/tests/bridge/core.test.ts`

### P1 (High)

5. `packages/local-first/tests/devtools.test.ts`
6. `packages/devtools/tests/panel/utils/timeline.test.ts`
7. `packages/devtools/tests/panel/utils/timeline-scale.test.ts`
8. `packages/prepaint/tests/errors.test.ts`

### P2 (Medium)

9. `packages/prepaint/tests/style-utils.test.ts`
10. `packages/prepaint/tests/utils.test.ts` 확장
11. `packages/tx/tests/errors.test.ts`
12. 패키지 간 통합 테스트 (tx + local-first 연동)
