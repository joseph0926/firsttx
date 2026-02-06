# 영역 이슈 레지스터: Performance

> 마지막 업데이트: 2026-02-06
> 대상 컴포넌트: `packages/prepaint/`, `packages/devtools/`, `apps/playground/`

## 운영 상태 요약

- 전체 이슈: 11
- Severity 분포: Critical 1, High 3, Medium 5, Low 2
- Status 분포: Open 2, Planned 7, Done 2

### <a id="perf-01"></a>PERF-01: serializeRoot DANGEROUS_ATTRIBUTES 이중 루프

- **ID**: PERF-01
- **Severity**: Critical
- **Status**: Done
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/capture.ts:152-172`
- **Impact**: DOM 크기에 비례해 O(NxM) 비용이 증가해 캡처 지연 및 bfcache 이탈 위험이 커집니다.
- **Repro**: 1000+ 노드 DOM에서 캡처를 반복하고 `hasAttribute/removeAttribute` 호출량과 처리 시간을 측정합니다.
- **Fix Plan**: `DANGEROUS_ATTRIBUTES`를 Set으로 캐시하고 element attributes 단일 순회로 변경합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`와 playground 성능 시나리오에서 캡처 시간 회귀를 비교합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: Local changeset (commit pending)

### <a id="perf-02"></a>PERF-02: fallbackSanitize 이중 루프 (boot critical path)

- **ID**: PERF-02
- **Severity**: High
- **Status**: Done
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/sanitize.ts:25-47`
- **Impact**: 복원 경로에서 sanitize 오버헤드가 증가해 첫 화면 복구 시간이 느려집니다.
- **Repro**: DOMPurify fallback 경로 강제 후 대용량 HTML 복원 시간 변화를 측정합니다.
- **Fix Plan**: Set 캐시/속성 단일 순회 적용, 필요 시 fallback 경로 호출 빈도를 축소합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`에 sanitize 성능 회귀 케이스를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: Local changeset (commit pending)

### <a id="perf-03"></a>PERF-03: invalid snapshot 시 DB 재오픈 비용

- **ID**: PERF-03
- **Severity**: High
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/boot.ts:153-171`
- **Impact**: 손상 스냅샷 처리 시 불필요한 DB reopen으로 boot latency가 증가합니다.
- **Repro**: invalid snapshot 주입 후 boot 시 DB open/close 횟수와 지연을 측정합니다.
- **Fix Plan**: 유효성 판정 후 단일 트랜잭션 내 삭제/정리를 수행하도록 흐름을 단순화합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`에서 invalid snapshot 복원 성능/정합성을 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-04"></a>PERF-04: DevTools bridge 자동 초기화 side-effect

- **ID**: PERF-04
- **Severity**: High
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/devtools`
- **Location**: `packages/devtools/src/bridge/index.ts:29-31`
- **Impact**: import만으로 bridge가 초기화되어 프로덕션에서도 불필요한 리소스 사용이 발생합니다.
- **Repro**: DevTools 미사용 번들에서 bridge 모듈 import 시 이벤트 버퍼/채널 생성 여부를 확인합니다.
- **Fix Plan**: 명시적 초기화 API로 전환하고 `__FIRSTTX_DEV__` 게이트 및 sideEffects 선언을 정비합니다.
- **Validation**: `pnpm --filter @firsttx/devtools test` + 번들 분석으로 자동 초기화 제거를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-05"></a>PERF-05: cleanupOldEvents 무조건 실행 비용

- **ID**: PERF-05
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/devtools`
- **Location**: `packages/devtools/src/bridge/core.ts:485-536`
- **Impact**: 이벤트마다 불필요한 IndexedDB 트랜잭션이 발생해 브리지 처리량이 저하됩니다.
- **Repro**: 고빈도 이벤트 스트림에서 cleanup 호출 횟수와 DB transaction 수를 측정합니다.
- **Fix Plan**: 임계값 초과 시에만 cleanup을 수행하고 count 기반 삭제로 변경합니다.
- **Validation**: `pnpm --filter @firsttx/devtools test`에서 cleanup 호출 빈도 회귀를 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-06"></a>PERF-06: filterEvents의 반복 JSON 직렬화

- **ID**: PERF-06
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/devtools`
- **Location**: `packages/devtools/src/panel/utils/filter.ts:42`
- **Impact**: 검색 입력 시마다 전체 이벤트 직렬화가 반복되어 UI 입력 지연이 증가합니다.
- **Repro**: 1000+ 이벤트 상태에서 검색창 입력 지연 시간을 측정합니다.
- **Fix Plan**: 검색용 문자열 캐시를 도입하거나 debounce를 적용합니다.
- **Validation**: `pnpm --filter @firsttx/devtools test`에서 필터 실행 시간/호출 횟수 회귀를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-07"></a>PERF-07: 패널 events 배열 무한 성장

- **ID**: PERF-07
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/devtools`
- **Location**: `packages/devtools/src/panel/App.tsx:41`
- **Impact**: 장시간 사용 시 메모리 사용량과 렌더링 비용이 계속 증가합니다.
- **Repro**: 장시간 이벤트 수집 시 메모리 스냅샷과 렌더 프레임 시간을 측정합니다.
- **Fix Plan**: 이벤트 상한선(예: 1000)과 순환 버퍼 전략을 도입합니다.
- **Validation**: `pnpm --filter @firsttx/devtools test` 및 브라우저 프로파일로 메모리 상한 유지 여부를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-08"></a>PERF-08: collectStyles 5초 timeout 과다

- **ID**: PERF-08
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/capture.ts:79-149`
- **Impact**: 스타일 fetch 대기 시간이 길어 캡처 완료 지연이 발생합니다.
- **Repro**: 느린 네트워크 환경에서 visibilitychange 시 스타일 수집 완료 시간을 측정합니다.
- **Fix Plan**: timeout을 1~2초로 축소하고 캐시 우선 전략을 적용합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`와 playground 느린 네트워크 시나리오로 회귀 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-09"></a>PERF-09: TimelineSVG config 객체 참조 불안정

- **ID**: PERF-09
- **Severity**: Medium
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/devtools`
- **Location**: `packages/devtools/src/panel/components/TimelineSVG.tsx:33`
- **Impact**: memoization 무효화로 불필요한 재계산/재렌더링이 발생합니다.
- **Repro**: 동일 props 렌더 반복 시 `useMemo` 재실행 횟수를 측정합니다.
- **Fix Plan**: `config` 객체 생성을 `useMemo`로 감싸 참조 안정성을 보장합니다.
- **Validation**: `pnpm --filter @firsttx/devtools test`에서 렌더 횟수 회귀를 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-10"></a>PERF-10: shared 패키지 sideEffects 미선언

- **ID**: PERF-10
- **Severity**: Low
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/shared`
- **Location**: `packages/shared/package.json`
- **Impact**: 트리 셰이킹 최적화가 제한될 수 있습니다.
- **Repro**: shared 모듈 일부만 사용하는 번들에서 dead code 잔존 여부를 분석합니다.
- **Fix Plan**: `package.json`에 `"sideEffects": false`를 검토/반영합니다.
- **Validation**: `pnpm --filter @firsttx/shared build` 및 번들 비교로 코드 제거 효과를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="perf-11"></a>PERF-11: resolveHref anchor 생성 반복 비용

- **ID**: PERF-11
- **Severity**: Low
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/capture.ts:46-63`
- **Impact**: 스타일 항목이 많을 때 불필요한 DOM 객체 생성/GC 비용이 누적됩니다.
- **Repro**: 다수 스타일 링크 환경에서 capture 중 anchor 생성 횟수와 GC 이벤트를 확인합니다.
- **Fix Plan**: `new URL(href, document.baseURI)` 기반으로 URL 해석 경로를 단순화합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`에서 URL 해석 회귀와 성능 지표를 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD
