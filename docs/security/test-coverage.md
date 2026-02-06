# 영역 이슈 레지스터: Test Coverage

> 마지막 업데이트: 2026-02-06
> 대상 범위: 모노레포 테스트 공백 중 우선 대응 항목

## 운영 상태 요약

- 전체 이슈: 12
- Severity 분포: Critical 4, High 4, Medium 4
- Status 분포: Open 4, Planned 8

## 기준선 스냅샷

| 패키지                 | 현재 상태                          | 핵심 갭                                                             |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| `@firsttx/local-first` | 핵심 훅/스토리지 일부 테스트됨     | `cache-manager`, `sync-manager`, `storage-manager` 직접 테스트 없음 |
| `@firsttx/devtools`    | helper/filter 위주 테스트          | `bridge/core` 및 panel 주요 유틸 미테스트                           |
| `@firsttx/prepaint`    | 주요 경로 테스트 존재              | `errors`, `style-utils`, 일부 유틸 엣지 케이스 부족                 |
| `@firsttx/tx`          | transaction/retry/hook 테스트 존재 | 에러 클래스/Abort edge 케이스 부족                                  |
| `apps/playground`      | 주요 E2E 시나리오 존재             | offline/cross-tab/TTL 시나리오 부족                                 |

### <a id="tc-01"></a>TC-01: `cache-manager.ts` 직접 단위 테스트 부재

- **ID**: TC-01
- **Severity**: Critical
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/cache-manager.ts` (target: `packages/local-first/tests/cache-manager.test.ts`)
- **Impact**: 상태 전이/구독자 알림/동등성 최적화 회귀를 조기에 탐지하지 못합니다.
- **Repro**: 커버리지 리포트에서 `cache-manager.ts` 직접 커버리지 항목 부재를 확인합니다.
- **Fix Plan**: 상태 전이, subscriber count, stale 계산, 참조 동등성 케이스를 포함한 단위 테스트를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test` 실행 후 신규 테스트 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-02"></a>TC-02: `sync-manager.ts` 핵심 흐름 테스트 부재

- **ID**: TC-02
- **Severity**: Critical
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/sync-manager.ts` (target: `packages/local-first/tests/sync-manager.test.ts`)
- **Impact**: dedupe/revalidation/merge/patch 직렬화 회귀가 production에서만 드러날 수 있습니다.
- **Repro**: race 상황을 재현해도 이를 자동 탐지할 단위 테스트가 없습니다.
- **Fix Plan**: `getSyncPromise` dedupe, `revalidateInBackground`, `replace/patch` 시나리오 테스트를 작성합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`와 해당 테스트 파일 단독 실행으로 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-03"></a>TC-03: `storage-manager.ts` 마이그레이션/에러 분기 테스트 부재

- **ID**: TC-03
- **Severity**: Critical
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/storage-manager.ts` (target: `packages/local-first/tests/storage-manager.test.ts`)
- **Impact**: 버전 마이그레이션/검증 실패/직렬화 큐 정책 변경이 검증 없이 배포될 수 있습니다.
- **Repro**: schema mismatch 상황에서 자동 삭제/복구 동작을 수동으로만 검증해야 합니다.
- **Fix Plan**: migration, zod failure cleanup, enqueue serialization, env 분기 테스트를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`에서 신규 시나리오 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-04"></a>TC-04: `bridge/core.ts` 핵심 동작 테스트 부재

- **ID**: TC-04
- **Severity**: Critical
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/devtools`
- **Location**: `packages/devtools/src/bridge/core.ts` (target: `packages/devtools/tests/bridge/core.test.ts`)
- **Impact**: 이벤트 버퍼링/브로드캐스트/영속화 로직 회귀가 탐지되지 않습니다.
- **Repro**: 고빈도 이벤트 시나리오를 실행해도 브리지 핵심 경로를 검증하는 자동 테스트가 없습니다.
- **Fix Plan**: batch 전송, high-priority persist, 채널 연결/해제 케이스를 포함한 테스트를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/devtools test`에서 bridge core 테스트 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-05"></a>TC-05: local-first devtools emit 안전성 테스트 보강 필요

- **ID**: TC-05
- **Severity**: High
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/devtools.ts` (target: `packages/local-first/tests/devtools.test.ts`)
- **Impact**: 브라우저/런타임 차이에 따른 emit 실패가 조용히 누락될 수 있습니다.
- **Repro**: `window` 미정의/DevTools API 누락 조건에서 emit 함수 동작을 확인할 테스트가 없습니다.
- **Fix Plan**: 환경별 fallback 및 예외 처리 분기 테스트를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test` 실행 결과로 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-06"></a>TC-06: timeline 유틸 테스트 부재

- **ID**: TC-06
- **Severity**: High
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/devtools`
- **Location**: `packages/devtools/src/panel/utils/timeline.ts`, `packages/devtools/src/panel/utils/timeline-scale.ts`
- **Impact**: 시간축 그룹핑/스케일 계산 회귀가 UI 오동작으로 이어질 수 있습니다.
- **Repro**: 타임라인 표시 이상을 재현해도 유틸 레벨 단위 테스트가 없습니다.
- **Fix Plan**: `groupTxEvents()`, `calculateTimelineScale()`를 별도 테스트 파일로 추가합니다.
- **Validation**: `pnpm --filter @firsttx/devtools test`에서 유틸 테스트 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-07"></a>TC-07: prepaint errors 모듈 직접 테스트 부재

- **ID**: TC-07
- **Severity**: High
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/errors.ts` (target: `packages/prepaint/tests/errors.test.ts`)
- **Impact**: 에러 타입/매핑 변경 시 디버깅 정보 품질이 저하될 수 있습니다.
- **Repro**: `convertDOMException()` 분기와 커스텀 에러 직렬화를 자동 검증하는 테스트가 없습니다.
- **Fix Plan**: 에러 클래스별 생성/직렬화/메시지 매핑 테스트를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test` 실행으로 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-08"></a>TC-08: 패키지 간 통합 테스트 부재 (`tx + local-first`)

- **ID**: TC-08
- **Severity**: High
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`, `@firsttx/tx`
- **Location**: integration layer (target: `packages/tx/tests/integration/*` 또는 `apps/playground/tests/*`)
- **Impact**: 패키지 경계에서의 계약 불일치가 단위 테스트만으로는 탐지되지 않습니다.
- **Repro**: 낙관적 업데이트 + 저장소 동기화 결합 시나리오를 자동 검증하는 테스트가 없습니다.
- **Fix Plan**: tx 실행과 local-first 저장/롤백을 결합한 통합 테스트를 추가합니다.
- **Validation**: `pnpm run test`와 대상 패키지 테스트에서 통합 시나리오 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-09"></a>TC-09: `style-utils.ts` 엣지 케이스 테스트 부재

- **ID**: TC-09
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/style-utils.ts` (target: `packages/prepaint/tests/style-utils.test.ts`)
- **Impact**: 스타일 정규화 함수의 빈 값/잘못된 입력 처리 회귀가 발생할 수 있습니다.
- **Repro**: `normalizeSnapshotStyleEntry()`에 빈 문자열/undefined href 입력 케이스를 자동 검증할 테스트가 없습니다.
- **Fix Plan**: edge input matrix 기반 단위 테스트를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`에서 신규 테스트 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-10"></a>TC-10: prepaint 유틸/boot 엣지 경로 테스트 보강 필요

- **ID**: TC-10
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/utils.ts`, `packages/prepaint/src/boot.ts`
- **Impact**: route key override, style append 등 엣지 경로 회귀 탐지가 어렵습니다.
- **Repro**: `resolveRouteKey()`, `appendStyleResource()` 엣지 입력을 검증하는 직접 테스트가 부족합니다.
- **Fix Plan**: `utils.test.ts`, `boot.test.ts`에 대상 케이스를 확장합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test` 실행으로 회귀를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-11"></a>TC-11: tx errors/abort edge 테스트 보강 필요

- **ID**: TC-11
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/tx`
- **Location**: `packages/tx/src/errors.ts`, `packages/tx/src/transaction.ts`
- **Impact**: 취소/타임아웃/에러 메시지 회귀가 사용자 오류 처리에 영향을 줄 수 있습니다.
- **Repro**: AbortSignal 타이밍과 에러 객체 직렬화를 자동 검증하는 직접 테스트가 부족합니다.
- **Fix Plan**: errors 클래스 단위 테스트와 abort edge 시나리오 테스트를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/tx test`에서 신규 케이스 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="tc-12"></a>TC-12: E2E offline/cross-tab/TTL 시나리오 보강 필요

- **ID**: TC-12
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `apps/playground`
- **Location**: `apps/playground/tests/*.spec.ts`
- **Impact**: 실제 사용자 환경(오프라인/멀티탭/TTL 만료) 회귀를 놓칠 수 있습니다.
- **Repro**: 기존 E2E 세트에는 offline, cross-tab sync, TTL expiry 시나리오가 없습니다.
- **Fix Plan**: 신규 Playwright 스펙 3종을 추가해 핵심 복원/동기화 경로를 검증합니다.
- **Validation**: `pnpm --filter playground test` 실행으로 신규 시나리오 통과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD
