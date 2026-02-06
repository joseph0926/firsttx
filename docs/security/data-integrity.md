# 데이터 무결성 분석

> 감사일: 2026-02-06 | 대상: `packages/local-first/`, `packages/tx/`

## 전체 평가: 주의 필요 (Needs Attention)

operationQueue 직렬화, Zod 스키마 검증, 에러 계층 구조, BroadcastChannel 폴백, AbortSignal 통합 등 설계는 양호하나, 백그라운드 revalidation race condition이라는 Critical 이슈가 존재합니다.

---

## 이슈 목록

### DATA-01: Background Revalidation Race Condition (Critical)

- **심각도**: Critical
- **위치**: `packages/local-first/src/sync-manager.ts:88-117`
- **설명**: `revalidateInBackground()`는 `current` 데이터를 캡처한 후 fetcher를 호출하지만, 네트워크 응답 대기 중 사용자가 `patch()` 또는 `replace()`로 데이터를 변경하면, 백그라운드 revalidation이 `this.replace(fresh)`를 호출하여 사용자의 최근 변경을 덮어쓴다.
- **재현 시나리오**:
  1. 페이지 로드 → stale 데이터 로드 → 백그라운드 revalidation 시작
  2. revalidation 응답 대기 중 사용자가 `patch()` 호출
  3. revalidation 응답 도착 → `replace()`가 patch 결과를 덮어씀
- **영향**: 사용자가 방금 수정한 데이터가 서버의 이전 데이터로 사일런트 롤백. 데이터 손실 발생.
- **권장 수정**:
  - generation counter 도입 — revalidation 시작 시 generation 기록, replace 호출 전 현재 generation과 비교, 불일치 시 결과 폐기
  - 또는 기본 merge 함수 `(_, next) => next`를 개선하여 로컬 변경을 존중하는 merge 전략 기본 제공

### DATA-02: operationQueue 에러 격리 부재

- **심각도**: High
- **위치**: `packages/local-first/src/storage-manager.ts:136-143`
- **설명**: `enqueue()` 메서드는 Promise chain으로 직렬화하며, 에러 발생 시 체인 깨짐을 방지하지만, 첫 번째 operation이 실패하면 후속 operation이 일관성 없는 상태에서 실행될 수 있다.
- **영향**: 에러 발생 시 후속 작업의 데이터 일관성 보장 불가
- **권장 수정**: 큐의 operation 실패 시 후속 operation 자동 취소, 또는 실패한 operation이 상태를 변경하지 않도록 보장.

### DATA-03: IndexedDB 커넥션 유실 후 자동 복구 미지원

- **심각도**: High
- **위치**: `packages/local-first/src/storage.ts:56-62`
- **설명**: `onversionchange` 이벤트에서 `db.close()` + `this.dbPromise = undefined`로 커넥션을 닫지만, 이전에 열어둔 트랜잭션이 진행 중이면 `AbortError`로 실패한다. 이 에러에 대한 복구 로직이 없다.
- **영향**: DB 버전 변경(다른 탭에서 업그레이드) 시 진행 중인 작업이 모호한 에러로 실패
- **권장 수정**: `onversionchange` 시 진행 중인 작업 감지, 커넥션 재설정 후 자동 재시도 또는 명시적 "페이지 새로고침" 메시지 표시.

### DATA-04: 트랜잭션 Rollback 실패 시 UI 상태 불일치

- **심각도**: High
- **위치**: `packages/tx/src/hooks.ts:71-101`, `packages/tx/src/transaction.ts:204-257`
- **설명**: `useTx`에서 optimistic 단계 실행 후 request 단계 실패 시 rollback 트리거. 그러나 `compensate()` 함수가 실패하면 `CompensationFailedError`가 throw되고, UI 상태(optimistic 업데이트)는 적용된 채로 남아 실제 서버/IndexedDB 데이터와 불일치.
- **영향**: 낙관적 업데이트 성공 + 서버 요청 실패 + 롤백 실패 시 UI-데이터 불일치
- **권장 수정**: `CompensationFailedError` 발생 시 강제 새로고침 권고 UI 피드백 제공. 에러 객체에 불일치 상태 정보 포함.

### DATA-05: Storage.set() resolve 타이밍

- **심각도**: Medium
- **위치**: `packages/local-first/src/storage.ts:109-136`
- **설명**: `set()`이 `request.onsuccess`에서 resolve하는데, IDB 스펙상 트랜잭션이 아직 commit되지 않은 상태일 수 있다. 크래시 시 데이터 유실 가능.
- **영향**: 극히 드문 경우(크래시, 전원 꺼짐)에 데이터 유실. 캐시 용도로는 수용 가능.
- **권장 수정**: `request.onsuccess` 대신 `tx.oncomplete`에서 resolve 고려.

### DATA-06: useSuspenseSyncedModel getCombinedSnapshot 참조 불안정

- **심각도**: Medium
- **위치**: `packages/local-first/src/suspense.ts:18-22`
- **설명**: `useSyncExternalStore`의 두 번째 인자로 인라인 화살표 함수 전달. 매 렌더마다 새 함수 참조 생성 → 불필요한 re-subscription 가능성.
- **영향**: 미미한 성능 영향. Suspense boundary 내 불안정한 동작 유발 가능.
- **권장 수정**: `hooks.ts`와 동일하게 `model.getCombinedSnapshot`을 직접 참조로 전달.

### DATA-07: BroadcastChannel 메시지 검증 부재

- **심각도**: Low
- **위치**: `packages/local-first/src/broadcast.ts:136-154`
- **설명**: `onmessage` 핸들러에서 `event.data`를 타입 단언만 하고 구조 검증하지 않음. 잘못된 형식의 메시지 수신 시 TypeError 발생 가능.
- **영향**: 같은 도메인 내에서만 발생하므로 실제 위험도 낮음.
- **권장 수정**: 메시지 수신 시 기본 구조 검증(type, key, senderId 필드 존재 여부) 추가.
