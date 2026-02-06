# 영역 이슈 레지스터: Data Integrity

> 마지막 업데이트: 2026-02-06
> 대상 컴포넌트: `packages/local-first/`, `packages/tx/`

## 운영 상태 요약

- 전체 이슈: 7
- Severity 분포: Critical 1, High 3, Medium 2, Low 1
- Status 분포: Open 3, Planned 3, Done 1

### <a id="data-01"></a>DATA-01: Background Revalidation Race Condition

- **ID**: DATA-01
- **Severity**: Critical
- **Status**: Done
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/sync-manager.ts:96-142`
- **Impact**: 사용자 최신 변경이 백그라운드 revalidation 응답으로 덮여 데이터 손실이 발생할 수 있습니다.
- **Repro**: stale 데이터 로드 -> revalidation 대기 중 `patch()` 수행 -> 응답 도착 후 `replace(fresh)`로 로컬 변경이 사라지는지 확인합니다.
- **Fix Plan**: generation counter 또는 optimistic merge guard를 도입해 중간 변경 발생 시 revalidation 결과를 폐기합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`에 race 재현 테스트를 추가하고 재발 여부를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: Local changeset (commit pending)

### <a id="data-02"></a>DATA-02: operationQueue 에러 격리 정책 부재

- **ID**: DATA-02
- **Severity**: High
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/storage-manager.ts:136-143`
- **Impact**: 선행 작업 실패 후 후속 작업이 불완전 상태에서 실행되어 일관성이 깨질 수 있습니다.
- **Repro**: 첫 enqueue 작업을 의도적으로 실패시킨 뒤 후속 enqueue 동작 결과를 관찰합니다.
- **Fix Plan**: 실패 전파 정책(후속 취소 또는 복구 후 재실행)을 명시하고 큐 구현에 반영합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`에서 enqueue 실패 격리 시나리오를 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="data-03"></a>DATA-03: onversionchange 이후 자동 복구 미지원

- **ID**: DATA-03
- **Severity**: High
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/storage.ts:56-62`
- **Impact**: 다른 탭에서 DB 버전 변경 시 진행 중 작업이 `AbortError`로 실패하고 복구 경로가 없습니다.
- **Repro**: 탭 A/B 동시 실행 후 한 탭에서 버전 업그레이드 트리거, 다른 탭 작업 실패 패턴을 확인합니다.
- **Fix Plan**: connection reset + 재시도 또는 사용자 가이드(새로고침 필요)를 명시적으로 추가합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`에서 versionchange 시뮬레이션 케이스를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="data-04"></a>DATA-04: Rollback 실패 시 UI-데이터 불일치

- **ID**: DATA-04
- **Severity**: High
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/tx`
- **Location**: `packages/tx/src/hooks.ts:71-101`, `packages/tx/src/transaction.ts:204-257`
- **Impact**: 보상(compensation) 실패 시 optimistic UI 상태가 남아 서버/스토리지와 불일치가 발생합니다.
- **Repro**: 요청 실패 + compensation 실패를 동시에 유도하고 화면/실데이터 불일치 여부를 확인합니다.
- **Fix Plan**: `CompensationFailedError`에 불일치 플래그를 포함하고 사용자 복구 액션(재동기화/새로고침)을 제공합니다.
- **Validation**: `pnpm --filter @firsttx/tx test`에서 compensation 실패 시나리오를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="data-05"></a>DATA-05: Storage.set resolve 타이밍 개선 필요

- **ID**: DATA-05
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/storage.ts:109-136`
- **Impact**: 드문 크래시 상황에서 트랜잭션 커밋 전 resolve로 데이터 유실 가능성이 남습니다.
- **Repro**: `request.onsuccess` 직후 강제 중단을 시뮬레이션하고 커밋 여부를 확인합니다.
- **Fix Plan**: resolve 시점을 `tx.oncomplete`로 이동하는 변경을 검토합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`에서 커밋 완료 시점 보장 테스트를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="data-06"></a>DATA-06: Suspense snapshot getter 참조 불안정

- **ID**: DATA-06
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/suspense.ts:18-22`
- **Impact**: 불필요한 re-subscription으로 렌더링 안정성이 저하될 수 있습니다.
- **Repro**: 반복 렌더 상황에서 getter 함수 참조 변경 여부와 subscribe 호출 수를 확인합니다.
- **Fix Plan**: 인라인 함수 대신 안정적인 메서드 참조를 직접 전달합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`에서 subscribe 횟수 회귀 테스트를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="data-07"></a>DATA-07: BroadcastChannel 입력 구조 검증 부재

- **ID**: DATA-07
- **Severity**: Low
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/local-first`
- **Location**: `packages/local-first/src/broadcast.ts:136-154`
- **Impact**: 비정상 메시지 수신 시 런타임 오류 가능성이 있습니다.
- **Repro**: 필수 필드가 누락된 메시지를 브로드캐스트하여 핸들러 예외 여부를 확인합니다.
- **Fix Plan**: 수신 메시지 shape validation을 추가하고 invalid 메시지는 무시/로깅 처리합니다.
- **Validation**: `pnpm --filter @firsttx/local-first test`에서 malformed message 케이스를 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD
