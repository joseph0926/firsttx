# Prepaint 저장·복원 보안 정책 SPEC Packet

날짜: 2026-07-16
상태: 구현·검증 완료
대상 repo/surface: `packages/prepaint`, `apps/playground`, 공개 Prepaint 문서
작업 분류 (Task classification): L-C
패킷 모드 (Packet mode): interactive
Artifact: new
사용자 확정 신호: 2026-07-16 “네” — Q1~Q4 권장 계약 확정 및 구현 시작 승인

## 내가 이해한 요청

- 요청 요약: `docs/update-plan.md`의 Phase 1-B를 구현한다.
- 사용자가 원하는 결과: 명시적으로 허용한 route만 snapshot을 저장·복원하고, 저장 기간·크기·CSS·lifecycle·CSP·sanitizer 경계를 안전한 공개 계약으로 제공한다.
- 원문 요청: “Phase 1-B 진행합시다”

## 현재 확정된 것

- Phase 1-A에서 cached DOM hydration을 제거했고, snapshot은 React root 밖의 비상호작용 overlay로만 복원한다.
- 실제 React 앱은 빈 container에서 `createRoot()`로 시작하고 첫 commit 뒤 overlay를 제거한다.
- allowlist가 없으면 capture와 restore를 모두 비활성화해야 한다.
- capture와 boot restore는 하나의 route allowlist 정책을 사용해야 한다.
- 비허용·만료·크기 초과 snapshot은 복원하지 않고 저장소에서도 제거해야 한다.
- TTL, 최대 snapshot 크기, CSS 저장 여부를 설정 가능하게 해야 한다.
- `beforeunload` listener를 제거하고 활성·유휴 시점에 snapshot을 미리 준비해야 한다.
- runtime CSP nonce를 제공하는 server adapter는 이 작업의 범위가 아니다.
- `c2280ba`에 반영된 공개 문서 정합성 계약은 보존하고 이 작업의 최종 문서 계약에 포함한다.

## 미정 질문 (Open Questions)

| 질문                                                                                                                                                                | 왜 묻는가                                                                         | 답변이 구현에 미치는 영향                                                              | 상태          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| Q1. 표준 Vite API를 `firstTx({ policy: { routes, ttlMs, maxSnapshotBytes, includeStyles } })`로 두고 boot가 직렬화한 동일 정책을 `setupCapture()`가 읽게 할 것인가? | boot는 앱 bundle보다 먼저 실행되므로 build-time 전달 방식이 공개 API를 결정한다.  | plugin option, 전역 정책 전달, manual `boot(policy)` fallback, export type가 정해진다. | answered: yes |
| Q2. 명시적으로 opt-in한 정책의 기본값을 exact path matching, TTL 7일, 최대 1 MiB, CSS 포함으로 둘 것인가?                                                           | default-off 보안은 유지하면서 기존 replay 품질과 저장 한도를 결정한다.            | validation, size 계산, capture/restore 테스트와 migration note가 달라진다.             | answered: yes |
| Q3. 최초 migration에서 DB version을 2로 올려 legacy snapshot을 전부 폐기하고, 이후 boot마다 비허용 record를 prune할 것인가?                                         | 기존 record에는 새 정책 provenance가 없어 안전하게 허용 여부를 증명할 수 없다.    | migration 구현과 첫 업데이트 뒤 cold start 동작이 결정된다.                            | answered: yes |
| Q4. 정적 Vite의 기본을 external self-starting boot asset으로 바꾸고 `inline: true`는 명시적 CSP hash 사용 경로로 남길 것인가?                                       | 현재 inline 기본값과 non-inline boot 호출 방식은 CSP 완료 조건을 만족하지 못한다. | Vite plugin 기본값, HTML 출력, Changeset의 breaking migration 안내가 달라진다.         | answered: yes |

## 임시 가정 (Assumptions)

| 가정                                                                                 | 이유                                                                     | 확정 전 구현 가능? |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------ |
| A1. route는 현재와 동일하게 `window.location.pathname` exact match를 사용한다.       | glob/prefix semantics는 새로운 제품 기능이며 현재 계약에 없다.           | confirmed          |
| A2. opt-in 기본 TTL은 기존 7일을 유지한다.                                           | default-off가 보안 경계를 제공하므로 불필요한 replay 품질 변경을 피한다. | confirmed          |
| A3. 최대 크기는 HTML과 저장되는 style payload를 합한 UTF-8 byte 기준 1 MiB다.        | 문자열 길이보다 저장 비용을 일관되게 측정할 수 있다.                     | confirmed          |
| A4. CSS 포함은 opt-in 정책 안에서 기본 true이며 `includeStyles: false`로 끌 수 있다. | 명시적 허용 route에서 기존 시각 품질을 보존한다.                         | confirmed          |
| A5. external boot asset은 정책을 안전하게 직렬화해 자체적으로 `boot()`를 호출한다.   | inline 실행문 없이 CSP-friendly 기본 경로를 제공한다.                    | confirmed          |

## 목표 (Goal)

- 관찰 가능한 결과: 정책이 없거나 현재 route가 allowlist 밖이면 IndexedDB snapshot을 저장·복원하지 않는다.
- 관찰 가능한 결과: 허용 route에서도 TTL·최대 크기·CSS 설정을 지키고, 이전 정책의 부적격 record를 남기지 않는다.
- 관찰 가능한 결과: 캡처 준비는 활성·유휴 시점에 수행되고 `beforeunload`에 의존하지 않는다.
- 사용자/행위자: Vite 기반 CSR React 앱 개발자와 재방문 사용자.
- source request: `docs/update-plan.md` Phase 1-B.

## 범위 (Scope)

- `PrepaintPolicy` 공개 타입과 표준 Vite plugin 설정을 추가한다.
- boot와 capture가 동일한 정규화 정책을 소비하도록 한다.
- default-off, exact allowlist, TTL, 최대 byte 크기, CSS 포함 설정을 구현한다.
- IndexedDB v2 migration과 부적격 snapshot prune을 구현한다.
- active/idle preparation 및 `visibilitychange`·`pagehide` persist lifecycle을 구현하고 `beforeunload`를 제거한다.
- external self-starting boot asset과 inline CSP hash 안내를 구현한다.
- built-in fallback sanitizer의 threat boundary와 회귀 테스트를 보강한다.
- Prepaint unit tests, playground 핵심 E2E, packed consumer, 문서, Changeset과 migration note를 갱신한다.

## 제외 범위 (Non-goal)

- cached DOM hydration 또는 direct-restore 경로를 다시 추가하지 않는다.
- prefix, glob, 정규식, callback 기반 route matcher를 추가하지 않는다.
- server adapter와 per-response runtime CSP nonce를 구현하지 않는다.
- Local-First, Tx, DevTools protocol의 동작을 변경하지 않는다.
- snapshot 암호화나 server-side storage를 추가하지 않는다.
- sanitizer를 범용 HTML/CSS 보안 라이브러리로 확장하지 않는다.

## 도메인 계약 (Domain Contract)

- 도메인 object/resource: `PrepaintPolicy`, `Snapshot`, IndexedDB `firsttx-prepaint/snapshots`, boot asset, prepared snapshot.
- 상태 또는 전이: `disabled → eligible → prepared → persisted → restored → handed-off`; `disallowed | expired | oversized | invalid → purged`.
- 권위: 표준 Vite 사용에서는 plugin의 build-time `policy`가 boot와 runtime capture의 단일 권위다. manual 사용에서는 명시적 `boot(policy)`와 `setupCapture({ policy })`가 같은 정규화 규칙을 사용한다.
- invariant: allowlist에 없는 route의 snapshot은 새로 저장되지 않고 복원되지 않으며 발견 시 삭제된다.
- invariant: snapshot payload가 정책 최대 byte 크기를 넘으면 저장·복원되지 않는다.
- invariant: `includeStyles: false`이면 새 snapshot에 style payload를 저장하지 않고 기존 style payload도 복원하지 않는다.
- invariant: 정책이 없거나 유효한 route가 하나도 없으면 capture와 restore는 disabled다.
- invariant: snapshot HTML은 React root의 입력이 되지 않고 overlay에만 사용된다.

## 확정된 결정 (Prior Decisions)

- visual-only overlay handoff와 `createRoot()` 계약은 `@firsttx/prepaint@0.11.0`에서 확정됐다.
- `overlay`, `overlayRoutes`, `onHydrationError`는 한 릴리스 동안 deprecated no-op으로 유지한다.
- Local-First CAS/conflict, Tx concurrency, runtime CSP nonce는 별도 phase다.

## 선택지 / 프로토타입 결정 (Option Fan-out / Prototype Decision)

- 고려한 선택지: runtime-only `setupCapture({ routes })`, plugin-only policy, plugin이 boot와 capture에 공유 policy를 제공하는 방식.
- 선택한 안: plugin 공유 policy + manual explicit fallback.
- 기각한 대안: runtime-only 설정은 boot restore보다 늦어 default-off restore를 안전하게 제어할 수 없다.
- 결정 주체/source: 2026-07-16 사용자 “네”, `docs/update-plan.md`의 단일 allowlist 요구.
- 다시 열 조건: Vite 외 bundler adapter를 같은 릴리스에서 지원해야 하는 요구가 생길 때.

## 제약 (Constraints)

- 반드시 보존: Phase 1-A의 empty-root `createRoot()`와 first-commit overlay removal.
- 반드시 보존: deprecated option의 타입 호환성 한 릴리스.
- 반드시 읽을 source: `docs/update-plan.md`, `packages/prepaint/src`, 관련 unit/E2E, 공개 Prepaint 문서.
- local source-of-truth: 이 packet 확정본과 `docs/update-plan.md` Phase 1-B.
- 정책 직렬화는 `</script>` 및 line separator를 통한 script breakout을 허용하지 않는다.
- 새 dependency를 추가하지 않는다.

## 금지 리팩터 (Forbidden Refactor)

- Prepaint 밖 패키지의 공통 storage abstraction을 만들지 않는다.
- Phase 1-B와 무관한 error hierarchy, DevTools event protocol, build target을 바꾸지 않는다.
- 기존 사용자 변경이나 unrelated dirty work를 되돌리지 않는다.

## 완료 조건 (Acceptance Criteria)

- [x] AC1: policy 누락·빈 routes에서 capture와 restore가 모두 disabled이고 snapshot DB를 새로 채우지 않는다.
- [x] AC2: boot와 capture가 동일한 exact route allowlist를 사용하며 비허용 route record를 복원하지 않고 삭제한다.
- [x] AC3: DB v2 upgrade가 provenance 없는 legacy snapshot을 폐기하고 이후 policy 축소도 부적격 record를 prune한다.
- [x] AC4: `ttlMs`, `maxSnapshotBytes`, `includeStyles`가 capture와 restore 양쪽에서 일관되게 적용된다.
- [x] AC5: HTML과 저장 style payload의 UTF-8 byte 크기 초과가 저장 전과 복원 전에 거부·삭제된다.
- [x] AC6: active/idle 시점에 snapshot을 준비·저장하고 hidden/pagehide에서 마지막 flush를 시도하며 `beforeunload` listener를 등록하지 않는다.
- [x] AC7: external boot asset이 자체 실행되고 안전하게 직렬화된 policy를 사용하며 inline 경로는 CSP hash 사용법을 문서화한다.
- [x] AC8: fallback sanitizer가 금지 tag·event attribute·위험 URL을 overlay 삽입 전에 제거하고 CSS threat boundary가 문서화·테스트된다.
- [x] AC9: slow-JS revisit, route switching, legacy snapshot purge를 playground Playwright로 검증한다.
- [x] AC10: 공개 API, 기본값 변경, cold-start migration을 Changeset과 영·한 문서에 반영한다.
- [x] AC11: 실제 packed artifact에서 Vite plugin과 공개 type/export가 소비 가능하다.
- [x] AC12: 대상 unit test와 root typecheck·lint·test·build가 통과한다.

## 완료 조건 분류 (Acceptance Buckets)

| Bucket                | 필요한가 | Acceptance / 이유                                                               |
| --------------------- | -------- | ------------------------------------------------------------------------------- |
| user-visible behavior | yes      | AC1, AC2, AC4, AC6, AC7, AC9, AC10                                              |
| server authority      | N/A      | client-only snapshot 정책이다.                                                  |
| client recovery       | yes      | AC2, AC3, AC4, AC5, AC8                                                         |
| data consistency      | yes      | AC1~AC5                                                                         |
| performance           | yes      | AC5, AC6                                                                        |
| accessibility         | N/A      | 비상호작용 overlay 계약을 유지하며 새 UI를 만들지 않는다.                       |
| observability         | N/A      | 기존 error/capture/restore event 계약을 보존하며 새 protocol은 추가하지 않는다. |

## 엣지 케이스 (Edge Cases)

- Empty/loading/error: policy 또는 routes가 없으면 조용히 cold start하고 capture listener를 최소화한다.
- Permission/eligibility: 현재 route가 exact allowlist 밖이면 기존 record까지 삭제한다.
- Retry/duplicate/stale: 중복 setup과 idle callback이 listener·write를 누적하지 않고 최신 prepared snapshot만 저장한다.
- Partial failure: IndexedDB, style fetch, serialization 실패는 앱 렌더를 막지 않고 cold start로 복구한다.
- Partial failure: `TextEncoder`, `requestIdleCallback` 미지원 환경은 안전한 fallback을 사용한다.

## 작업 분해 (Task Breakdown)

| Task                                     | Acceptance         | Output files/artifacts                        | Verification               |
| ---------------------------------------- | ------------------ | --------------------------------------------- | -------------------------- |
| T1. policy type·정규화·직렬화            | AC1, AC2, AC4, AC7 | `types.ts`, policy module, plugin             | unit/typecheck             |
| T2. storage migration·prune·restore gate | AC2~AC5            | `utils.ts`, `boot.ts`                         | IndexedDB regression tests |
| T3. capture payload·idle lifecycle       | AC1, AC4~AC6       | `capture.ts`                                  | lifecycle/size/style tests |
| T4. sanitizer threat boundary            | AC8                | sanitizer tests and docs                      | malicious fixture tests    |
| T5. consumer·browser·문서·Changeset      | AC9~AC11           | playground, docs, changeset, consumer fixture | Playwright/pack            |
| T6. 전체 gate와 verify closure           | AC12               | packet evidence                               | root checks, verify-gate   |

## 검증 계획 (Verification Map)

| Claim group                          | Acceptance IDs  | Type                      | Planned / actual evidence                            | Check safety      | Coverage |
| ------------------------------------ | --------------- | ------------------------- | ---------------------------------------------------- | ----------------- | -------- |
| C1. default-off와 route/storage 정책 | AC1, AC2, AC3   | executable                | Prepaint unit + IndexedDB migration tests            | controlled-output | covered  |
| C2. TTL·size·CSS·lifecycle           | AC4, AC5, AC6   | executable                | capture/boot/lifecycle regression tests              | controlled-output | covered  |
| C3. CSP·sanitizer 경계               | AC7, AC8        | executable/static         | Vite output tests, malicious fixtures, docs diff     | controlled-output | covered  |
| C4. 실제 browser/package 소비        | AC9, AC10, AC11 | ui-operational/executable | Playwright, pnpm pack consumer, docs/Changeset audit | controlled-output | covered  |
| C5. 저장소 회귀 없음                 | AC12            | executable                | target + root typecheck/lint/test/build              | controlled-output | covered  |

- Acceptance coverage check: AC1~~AC12가 C1~~C5 중 정확히 하나에 매핑됐다.

## 증거 / 공백 로그 (Evidence / Gap Log)

- Research evidence: `docs/update-plan.md` Phase 1-B의 React lifecycle·CSP 공식 근거 링크.
- Local evidence: `PrepaintPolicy`와 동일 policy 정규화가 boot/capture/plugin에 연결됐고 DB schema는 v2다.
- Verification evidence: `@firsttx/prepaint` lint/typecheck/build와 12 files, 169 unit tests 통과.
- Browser evidence: `prepaint-handoff.spec.ts`의 slow-JS handoff, exact route switching, v1 purge 3 tests 통과. 전체 playground E2E 20 tests도 중간 검증에서 통과.
- Consumer evidence: `/tmp/firsttx-prepaint-consumer-20260716-1545`에서 실제 packed `@firsttx/prepaint@0.11.0`과 `@firsttx/shared@0.3.1`을 설치하고 public type/plugin import 및 `dist/firsttx-boot.js` 생성을 확인.
- Root evidence: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, `pnpm build` 통과. `git diff --check` 통과.
- Gap: high-risk 변경에 대한 fresh native `/review`는 제공되지 않았다. 기존 playground/devtools lint warning의 baseline delta는 확인하지 않았다.
- PASS-with-gaps owner/expiry/trigger, if any: 다음 commit/PR review 시 현재 diff에 대한 fresh review를 수행한다.

## 검증 폐쇄 (Verification Closure)

- Change risk: high
- Evidence confidence: partial
- Final verdict: PASS_WITH_GAPS
- Scope summary: in_scope
- State drift: none
- Native review: recommended-not-provided
- Gap owner/trigger: 다음 commit/PR review에서 fresh review를 수행한다.

## 사용자 피드백 로그 (User Feedback Log)

- 2026-07-16: Phase 1-B 진행 요청.
- 2026-07-16: Q1~Q4 권장 계약을 “네”로 확정.

## 조정 로그 (Reconciliation Log)

- 2026-07-16: `docs/update-plan.md` Phase 1-B를 기반으로 interactive packet 생성. API·기본값·migration·CSP 결정을 blocker로 분리.
- 2026-07-16: 사용자 확정에 따라 Q1~~Q4와 A1~~A5를 확정하고 상태를 구현 준비 완료로 전환.
- 2026-07-16: policy·migration·lifecycle·external asset·sanitizer·문서·Changeset을 구현하고 unit, Playwright, packed consumer, root gate 증거로 구현·검증 완료 상태로 전환.
