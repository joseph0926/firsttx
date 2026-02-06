# 영역 이슈 레지스터: Security

> 마지막 업데이트: 2026-02-06
> 대상 컴포넌트: `packages/prepaint/`, `packages/shared/`
> 이 문서는 내부 운영 추적용입니다. 외부 공개 정책은 `/Users/kimyounghoon/Downloads/@kyh/@firsttx/firsttx/SECURITY.md`를 사용합니다.

## 운영 상태 요약

- 전체 이슈: 7
- Severity 분포: Medium 3, Low 4
- Status 분포: Open 2, Planned 4, Done 1

### <a id="sec-01"></a>SEC-01: fallbackSanitize URI 필터링 보완 필요

- **ID**: SEC-01
- **Severity**: Medium
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`, `@firsttx/shared`
- **Location**: `packages/prepaint/src/sanitize.ts:40-48`, `packages/shared/src/browser.ts:85-94`
- **Impact**: DOMPurify 미탑재 환경 fallback 경로에서 일부 `data:` 변형 URI가 남을 수 있습니다.
- **Repro**: DOMPurify 로드 실패 상황에서 `data:text/javascript` URI가 포함된 HTML을 복원 경로로 전달합니다.
- **Fix Plan**: `data:` 전반을 기본 차단하고 허용 URI만 명시적으로 허용하는 방식으로 강화합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test` 실행 후 fallback 새니타이저 단위 테스트에 `data:` 변형 케이스를 추가해 확인합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="sec-02"></a>SEC-02: Vite 플러그인 nonce HTML 인젝션 가드 미흡

- **ID**: SEC-02
- **Severity**: Medium
- **Status**: Done
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/plugin/vite.ts:71-93,108-123`
- **Impact**: 신뢰되지 않은 nonce 문자열이 옵션으로 주입될 경우 HTML 속성 인젝션 가능성이 있습니다.
- **Repro**: 플러그인 옵션 `nonce`에 `\"` 또는 `>` 포함 문자열을 전달하고 생성된 HTML을 확인합니다.
- **Fix Plan**: nonce 허용 패턴(Base64 문자셋) 검증을 추가하고 실패 시 빌드를 중단합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`로 플러그인 테스트를 실행하고 invalid nonce 케이스를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: Local changeset (commit pending)

### <a id="sec-03"></a>SEC-03: SanitizeOptions 오남용 시 방어 약화 가능

- **ID**: SEC-03
- **Severity**: Medium
- **Status**: Open
- **Owner**: Unassigned
- **Component**: `@firsttx/shared`
- **Location**: `packages/shared/src/browser.ts:26-31,61-103`
- **Impact**: 호출자가 위험 태그/속성을 허용 목록에 추가하면 방어 수준이 약화될 수 있습니다.
- **Repro**: `allowedTags`에 위험 태그를 주입한 옵션으로 `sanitizeHTML()` 호출 후 결과를 확인합니다.
- **Fix Plan**: `ALWAYS_FORBIDDEN_TAGS/ATTRS`를 도입해 호출자 옵션보다 우선 적용합니다.
- **Validation**: `pnpm --filter @firsttx/shared test`로 browser sanitizer 테스트에서 강제 금지 규칙을 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="sec-04"></a>SEC-04: sanitize 후 innerHTML 재파싱 경로 점검 유지

- **ID**: SEC-04
- **Severity**: Low
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/boot.ts:226`
- **Impact**: 현재 악용 가능성은 낮지만, 구조 변경 시 mutation XSS 회귀 가능성을 주기적으로 확인해야 합니다.
- **Repro**: sanitize 결과를 재삽입하는 경로에서 특수 마크업을 주입해 DOM 변형 여부를 관찰합니다.
- **Fix Plan**: 구조는 유지하되 회귀 테스트를 보강해 변경 시 탐지합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test` 및 복원 경로 회귀 테스트를 실행합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="sec-05"></a>SEC-05: 스타일 복원 link href origin 검증 부재

- **ID**: SEC-05
- **Severity**: Low
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`, `@firsttx/shared`
- **Location**: `packages/shared/src/constants.ts:11-26`, `packages/prepaint/src/boot.ts:258-276`
- **Impact**: 스냅샷이 변조되면 외부 스타일 리소스 로드가 가능해질 수 있습니다.
- **Repro**: IndexedDB 스냅샷의 style href를 외부 origin으로 변경한 후 복원 동작을 확인합니다.
- **Fix Plan**: `appendStyleResource()`에서 same-origin 검증을 기본값으로 강제합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`에서 cross-origin href 차단 케이스를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="sec-06"></a>SEC-06: overlay shadow DOM 스타일 href 검증 부재

- **ID**: SEC-06
- **Severity**: Low
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/overlay.ts:63-67`
- **Impact**: shadow DOM 주입 경로에서도 외부 스타일 로드 검증 공백이 존재합니다.
- **Repro**: overlay 복원 시 `normalized.href`에 cross-origin 값을 주입합니다.
- **Fix Plan**: SEC-05와 동일한 origin 검증 정책을 overlay 경로에도 적용합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`에서 overlay style href 검증 케이스를 추가합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD

### <a id="sec-07"></a>SEC-07: resolveRouteKey 전역 함수 호출 가드 강화 필요

- **ID**: SEC-07
- **Severity**: Low
- **Status**: Planned
- **Owner**: Unassigned
- **Component**: `@firsttx/prepaint`
- **Location**: `packages/prepaint/src/utils.ts:43-48`
- **Impact**: 전역 오염 상황과 결합되면 route key 결정 경로의 신뢰성이 저하될 수 있습니다.
- **Repro**: `window.__FIRSTTX_ROUTE_KEY__`를 비정상 함수로 주입한 상태에서 route key 생성 경로를 실행합니다.
- **Fix Plan**: `Object.hasOwn` 확인 및 안전한 타입 가드를 추가합니다.
- **Validation**: `pnpm --filter @firsttx/prepaint test`에서 route key 함수 주입 케이스를 명시적으로 검증합니다.
- **Last Verified**: 2026-02-06
- **Related PR/Issue**: TBD
