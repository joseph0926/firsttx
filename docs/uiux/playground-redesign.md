---
workflow_version: 2
status: integrated
target: 'apps/playground: home, verification lab, scenario detail, guided entry'
mode: redesign
anchor: 'No external anchor'
baseline: 'artifacts/uiux/playground-redesign/baseline'
acceptance_source: 'docs/update-plan.md P0-D + docs/playground-contract.md'
candidate_ids:
  - signal-desk
  - proof-atlas
  - package-workbench
  - guided-trail
implemented_candidate_ids:
  - signal-desk
  - proof-atlas
final_decision_mode: synthesize
approved_direction: 'Proof Atlas visual/IA base + Signal Desk verification structure'
capture_manifest: 'artifacts/uiux/playground-redesign'
---

# Playground UI/UX decision packet

## Target와 사용자 Job

- Target route/component: `/`, `/tour/*`, 공개 scenario detail과 신규 Verification Lab
- Mode: strong recomposition redesign
- OSS 사용자 job: 강제 투어 없이 5분 체험과 자유 탐색 중 하나를 선택하고, 실제 동작·한계·측정 조건을 이해합니다.
- 개발자 job: workspace 수정이 현재 app/source에 반영되었는지 scenario, contract, metric, environment와 test owner까지 즉시 추적합니다.
- 현재 구조: hero → 세 package 문제/해결 → runtime diagnostics → benchmark cards → 9개 scenario card가 하나의 긴 흐름에 중첩되어 있습니다. 첫 방문 redirect, 정적 성공 fallback, metadata 중복과 mixed locale이 두 job의 판단을 방해합니다.

## Invariant와 Non-goal

- Existing content/function invariant: 실제 9개 scenario route, guided tour, docs 이동, package별 demo 실행은 보존합니다.
- Existing data/handler/routing/i18n/a11y/state invariant: package model·API·transaction handler, route semantics, locale axis, loading/error/recovery와 keyboard semantics를 시각 변경 때문에 제거하지 않습니다.
- Approved additive contract: 첫 화면의 `5분 체험`과 `Verification Lab` 동등 진입, source/freshness/environment/test owner, `passed/failed/expected-limitation/not-measured/stale/unsupported` 상태와 deterministic reset control을 추가합니다.
- IA, section order, DOM 골격, component topology와 visual language는 invariant가 아닙니다.
- Non-goal: Local-First conflict resolution, Tx concurrent isolation이나 Prepaint 성능 보장을 UI 작업에서 새로 만들지 않습니다.
- Production gate: 2026.07.19 사용자 승인 뒤 `/`, `/lab`, guided tour shell과 공개 scenario 공통 layout에 통합했습니다.

## Acceptance와 Evidence Trace

| ID  | Actor/trigger/state           | Expected outcome                                                              | Planned/actual evidence                                              | Status                      |
| --- | ----------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------- |
| AC1 | 첫 방문 OSS 사용자            | 강제 redirect 없이 guided path와 자유 검증 path를 이해                        | production `/` desktop/mobile                                        | integrated                  |
| AC2 | 개발자가 current run 확인     | source, freshness, environment, metric kind와 test owner를 한 흐름에서 추적   | production `/lab`, scenario contract receipt                         | integrated                  |
| AC3 | metric이 없거나 유효하지 않음 | 성공 수치 대신 not-measured, failed, stale, unsupported를 구분                | artifact 미연결·source 미게시를 명시하고 static success fixture 제거 | integrated, runtime pending |
| AC4 | expected-limitation scenario  | 실패가 아니라 현재 지원 경계를 설명하고 실행 근거를 제공                      | production `/sync/timing` contract receipt                           | integrated                  |
| AC5 | 390px mobile                  | 수평 overflow 없이 overview, Lab row와 scenario detail을 사용                 | browser `innerWidth=390`, `scrollWidth=390`                          | integrated                  |
| AC6 | keyboard 사용자               | semantic link/button, `aria-current`, visible focus와 disabled control을 구분 | production DOM snapshot, 42px target와 focus-visible                 | integrated                  |
| AC7 | KO/EN 전환                    | 대표 copy와 `<html lang>`이 locale과 일치                                     | production KO/EN, light/dark                                         | integrated                  |
| AC8 | production integration        | 실제 registry/artifact/handler를 연결하고 candidate-only code 제거            | registry 연결·candidate 제거; runtime artifact는 P0-E                | partial: UI integrated      |

Edge cases는 metric fetch failure, source mismatch, stale artifact, unsupported capability, expected limitation, deterministic reset unavailable, long test-owner text와 390px reflow입니다. Runtime loading·retry와 real artifact freshness는 P0-E~H 구현 뒤 production evidence로 다시 확인합니다.

## Anchor Decision

- Decision: No external anchor
- Evidence/source: FirstTx package README의 현재 제품 계약, `docs/playground-contract.md`, 기존 local token과 실제 scenario metadata
- Signal mapping:
  - color: correctness 상태는 제한된 semantic 색으로만 사용하고 candidate A는 ink/green, B는 paper/cobalt/coral로 방향을 분리
  - typography: 한국어 system sans를 기본으로 하고 Proof Atlas의 editorial serif는 display에만 제한
  - spacing/density: public entry는 여백과 narrative, Lab은 compact row와 provenance 우선
  - composition: 같은 scenario가 showcase와 verification evidence 사이에서 왕복 가능
  - interaction/motion: route 기반 view/locale 전환, `aria-current`, 42px 이상 target, reduced-motion fallback
- Research side effect disclosure: 외부 anchor와 `research-query`를 사용하지 않았고 telemetry/write-back은 없습니다.

## Baseline

- Type: current-screen
- Route/data state: persisted local fixture가 있는 `/`, `/tour/problem`, `/sync/timing`; 공개 사용자 데이터 없음
- Exact viewport: desktop `1440×1000`, mobile `390×844`
- Theme/locale: home·tour KO/dark, Timing EN/dark
- Environment/source revision: local Vite, Chromium in-app browser, `df1e923d531a`
- Sensitive-data handling: repo의 mock API와 local IndexedDB state만 사용; 실제 사용자·고객 데이터 없음
- Capture gap: full-page sticky capture가 viewport를 반복해 증거에서 제외했습니다. Mobile은 top/detail viewport를 분리하고 DOM `scrollWidth`로 reflow를 검산했습니다.

## Capture Manifest

| Artifact path                                                                                | Role               | Candidate   | Viewport  | Route/state/theme/locale              | Environment/source              | Selection | Evidence class | Sensitive-data handling |
| -------------------------------------------------------------------------------------------- | ------------------ | ----------- | --------- | ------------------------------------- | ------------------------------- | --------- | -------------- | ----------------------- |
| `artifacts/uiux/playground-redesign/baseline/home-desktop-1440x1000-ko-dark.jpg`             | baseline           | N/A         | 1440×1000 | `/`, persisted/dark/ko                | local Chromium / `df1e923d531a` | N/A       | direction      | mock/local only         |
| `artifacts/uiux/playground-redesign/baseline/home-mobile-390x844-ko-dark.jpg`                | baseline           | N/A         | 390×844   | `/`, persisted/dark/ko                | local Chromium / `df1e923d531a` | N/A       | direction      | mock/local only         |
| `artifacts/uiux/playground-redesign/baseline/tour-problem-desktop-1440x1000-ko-dark.jpg`     | baseline           | N/A         | 1440×1000 | `/tour/problem`, default/dark/ko      | local Chromium / `df1e923d531a` | N/A       | direction      | mock/local only         |
| `artifacts/uiux/playground-redesign/baseline/tour-problem-mobile-390x844-ko-dark.jpg`        | baseline           | N/A         | 390×844   | `/tour/problem`, default/dark/ko      | local Chromium / `df1e923d531a` | N/A       | direction      | mock/local only         |
| `artifacts/uiux/playground-redesign/baseline/timing-desktop-1440x1000-en-dark.jpg`           | baseline           | N/A         | 1440×1000 | `/sync/timing`, initial/dark/en       | local Chromium / `df1e923d531a` | N/A       | direction      | mock/local only         |
| `artifacts/uiux/playground-redesign/baseline/timing-mobile-390x844-en-dark.jpg`              | baseline           | N/A         | 390×844   | `/sync/timing`, initial/dark/en       | local Chromium / `df1e923d531a` | N/A       | direction      | mock/local only         |
| `artifacts/uiux/playground-redesign/signal-desk/overview-desktop-1440x1000-ko-dark.jpg`      | candidate overview | signal-desk | 1440×1000 | overview/dark/ko                      | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/overview-mobile-390x844-ko-dark.jpg`         | candidate overview | signal-desk | 390×844   | overview/dark/ko                      | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/overview-desktop-1440x1000-en-dark.jpg`      | locale state       | signal-desk | 1440×1000 | overview/dark/en                      | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/lab-desktop-1440x1000-ko-dark.jpg`           | candidate Lab      | signal-desk | 1440×1000 | lab/all statuses/dark/ko              | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/lab-mobile-top-390x844-ko-dark.jpg`          | mobile state       | signal-desk | 390×844   | lab/header/dark/ko                    | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/lab-mobile-detail-390x844-ko-dark.jpg`       | mobile state       | signal-desk | 390×844   | lab/status rows/dark/ko               | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/scenario-desktop-1440x1000-ko-dark.jpg`      | limitation state   | signal-desk | 1440×1000 | scenario/expected-limitation/dark/ko  | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/scenario-mobile-top-390x844-ko-dark.jpg`     | mobile limitation  | signal-desk | 390×844   | scenario/header/dark/ko               | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/signal-desk/scenario-mobile-detail-390x844-ko-dark.jpg`  | mobile limitation  | signal-desk | 390×844   | scenario/detail/dark/ko               | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/overview-desktop-1440x1000-ko-light.jpg`     | candidate overview | proof-atlas | 1440×1000 | overview/light/ko                     | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/overview-mobile-390x844-ko-light.jpg`        | candidate overview | proof-atlas | 390×844   | overview/light/ko                     | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/overview-desktop-1440x1000-en-light.jpg`     | locale state       | proof-atlas | 1440×1000 | overview/light/en                     | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/lab-desktop-1440x1000-ko-light.jpg`          | candidate Lab      | proof-atlas | 1440×1000 | lab/all statuses/light/ko             | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/lab-mobile-top-390x844-ko-light.jpg`         | mobile state       | proof-atlas | 390×844   | lab/header/light/ko                   | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/lab-mobile-detail-390x844-ko-light.jpg`      | mobile state       | proof-atlas | 390×844   | lab/status rows/light/ko              | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/scenario-desktop-1440x1000-ko-light.jpg`     | limitation state   | proof-atlas | 1440×1000 | scenario/expected-limitation/light/ko | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/scenario-mobile-top-390x844-ko-light.jpg`    | mobile limitation  | proof-atlas | 390×844   | scenario/header/light/ko              | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |
| `artifacts/uiux/playground-redesign/proof-atlas/scenario-mobile-detail-390x844-ko-light.jpg` | mobile limitation  | proof-atlas | 390×844   | scenario/detail/light/ko              | local Chromium / `df1e923d531a` | pending   | direction      | contract fixture        |

## Four Directions

| ID                  | IA/layout/component composition                                                                                    | Strength                                   | Risk                                                           | Preliminary score | Implement? |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------- | ----------------- | ---------- |
| `signal-desk`       | persistent provenance rail + dual-entry hero + compact contract queue/Lab table + deterministic scenario workbench | 개발 변경 확인과 evidence 추적이 가장 빠름 | public showcase가 도구 화면처럼 느껴질 수 있고 chrome이 무거움 | 8/8               | yes        |
| `proof-atlas`       | editorial hero + latest-evidence strip + package chapters + evidence ledger + three-fixture narrative              | OSS 설명력, 개성, share surface가 강함     | 반복 검증 scan과 bespoke state 확장 비용                       | 8/8               | yes        |
| `package-workbench` | package tree + live scenario canvas + trace inspector의 3-pane IDE                                                 | package ownership과 handler trace가 직접적 | 일반 사용자 진입과 mobile 확장성이 약함                        | 5/8               | no         |
| `guided-trail`      | role choice → linear mission map → step runner → evidence drawer                                                   | onboarding과 학습 진척이 명확              | 개발자의 전체 scenario scan과 자유 비교가 느림                 | 6/8               | no         |

## Implemented Candidates

### Signal Desk

- Preview surface: `/__uiux/playground-redesign/signal-desk?view=overview|lab|scenario&locale=ko|en`
- State coverage: passed, failed, expected-limitation, not-measured, stale, unsupported, current source, freshness, environment, disabled reset
- Composition: provenance rail, source pulse, scenario queue, compact Lab index, deterministic event console와 claim panel
- Product tradeoff: developer verification은 가장 빠르지만 public entry의 visual warmth와 mobile chrome을 줄여야 합니다.

### Proof Atlas

- Preview surface: `/__uiux/playground-redesign/proof-atlas?view=overview|lab|scenario&locale=ko|en`
- State coverage: 같은 status fixture, editorial evidence strip, ledger, three-interleaving comparison, limitation receipt
- Composition: narrative cover, package chapters, evidence index와 editorial scenario comparison
- Product tradeoff: OSS showcase로 강하지만 source/environment/freshness와 반복 작업 control이 Signal Desk보다 약합니다.

### Independent candidate scoring

구현에 참여하지 않은 읽기 전용 평가자가 desktop/mobile overview, Lab과 scenario evidence를 0–2 rubric으로 채점했습니다. 초기 full-page mobile screenshot은 sticky capture artifact로 확인되어 폐기했고, top/detail viewport와 `innerWidth=scrollWidth=390` 실측으로 재평가했습니다.

| Axis                       | Signal Desk | Proof Atlas |
| -------------------------- | ----------: | ----------: |
| First-glance comprehension |           2 |           2 |
| Information hierarchy      |           2 |           1 |
| Visual completion          |           2 |           2 |
| Product fit                |           2 |           1 |
| Implementation feasibility |           2 |           1 |
| Mobile stability           |           2 |           2 |
| State extensibility        |           2 |           1 |
| Surface economy            |           1 |           1 |
| Total                      |   **15/16** |   **11/16** |

- Signal Desk는 dual-audience 목적, provenance와 deterministic execution이 한 구조에 직접 연결됩니다. 단, production에서는 상시 sidebar와 중복 chrome을 줄여야 합니다.
- Proof Atlas는 OSS 소개의 개성과 설명력이 강하지만 bespoke editorial composition 때문에 반복 검증과 state 확장 비용이 큽니다.
- 독립 권고는 `synthesize`, base `signal-desk`이며 corrected mobile evidence 기준 남은 mobile blocker는 없습니다.

## State Matrix

| State                                | Candidate closure          | Evidence / next owner                                                                |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------ |
| loading / first-load                 | deferred                   | real loader는 P0-E/H에서 stable shell과 skeleton 연결                                |
| refresh / busy                       | deferred, disabled preview | artifact refresh control은 현재 disabled; P0-E runtime 연결                          |
| empty / no-results                   | implemented                | `not-measured`, `unsupported` fixture와 실행 요구 문구                               |
| error / recovery                     | partially implemented      | failed status와 reason 존재; retry handler는 P0-E/H                                  |
| focus / keyboard                     | implemented                | semantic routes, 42px targets, active link focus outline `3px solid`                 |
| accessible name / state announcement | partially implemented      | status가 색+텍스트를 사용; live run announcement는 P0-H                              |
| hover / pointer                      | implemented                | hover-only content 없음                                                              |
| target size / touch                  | implemented                | interactive base min-height 42px, mobile link/button path                            |
| disabled / blocked                   | implemented                | 미구현 refresh/reset은 disabled로 표시                                               |
| selected / current                   | implemented                | view, locale, candidate에 `aria-current`                                             |
| reduced motion                       | implemented                | scoped `prefers-reduced-motion` fallback                                             |
| zoom / reflow / text spacing         | candidate-covered          | 390px에서 6 view 모두 `scrollWidth=390`; zoom/text spacing은 production verification |
| assistive technology / service flow  | deferred                   | production handler 연결 뒤 screen-reader task flow 확인                              |

## Final Synthesis와 승인

- Decision mode: `synthesize`
- Approved base candidate: `proof-atlas`
- 가져올 요소:
  - Proof Atlas의 paper/cobalt/coral visual language, editorial public hero, chapter IA와 contract ledger
  - Signal Desk의 source/freshness/environment/test-owner, metric kind와 release-condition receipt
  - 실제 artifact가 없을 때 성공 수치를 대체하지 않는 `Not connected`·`Not published` 상태
  - guided tour와 자유 검증을 동등하게 제공하는 dual-entry home
- 제외할 요소:
  - Signal Desk의 dark dashboard shell, 상시 sidebar와 candidate switcher
  - Proof Atlas 후보의 static verification fixture와 hard-coded source revision
  - 기존 home의 `0ms`, `100%`, 고정 target fallback
- Production IA: Proof Atlas overview와 chapter를 base로 사용하고 `/lab` ledger 및 모든 공개 scenario의 contract receipt에 Signal Desk provenance 구조를 결합했습니다.
- 남은 위험: runtime artifact schema·loader 판정·deterministic reset handler는 P0-E~F가 소유하며 현재 UI는 이를 정직하게 미연결로 표시합니다.
- 승인 evidence/date: 2026.07.19 사용자 “진행” 승인

## Terminal State와 Recovery

- Terminal state: integrated
- Reason/evidence: Proof Atlas 기반 synthesis 승인, production route·shell·Lab·scenario receipt 통합과 browser reflow 확인
- Candidate-only cleanup: dev route, preview component/style과 static verification fixture 제거 완료
- Previous production behavior recovery: 기존 route와 package handler는 유지하며 visual shell만 교체했습니다.

## Production Integration과 Cleanup

- Integrated files: `home.page.tsx`, `verification-lab.page.tsx`, `playground-shell.tsx`, `playground.css`, 공통 demo/scenario/tour layout, router와 locale root state
- Candidate-only files: 없음
- Preserved evidence: 이 packet과 baseline/candidate screenshot

## Verification

- Native checks: `pnpm --filter playground typecheck`, `build` 통과. `lint` 오류 0·기존 hook warning 1
- Regression check: `pnpm --filter playground test:e2e --workers=2` Chromium `21/21` 통과
- Browser: production desktop `1280×720`, mobile `390×844`, KO/EN, light/dark overview, Lab과 expected-limitation receipt 확인
- Production captures: `artifacts/uiux/playground-redesign/production/home-desktop-1280x720-ko-light.jpg`, `lab-mobile-390x844-ko-light.jpg`, `timing-desktop-1280x720-ko-light.jpg`
- Reflow: production overview와 Lab에서 `innerWidth=390`, `scrollWidth=390`
- Keyboard: semantic link/button, route별 `aria-current`, 42px 이상 action target과 `focus-visible` outline
- Sensitive data: repo mock/local fixture만 사용
- Production correctness evidence: contract registry 연결과 artifact 미연결 disclosure. Runtime correctness는 P0-E~F 전까지 증명하지 않습니다.
- Gaps: real metric artifact, deterministic reset, zoom/text spacing과 assistive-technology flow

## Research Status

- Research status: not requested; no external anchor
- Freshness: repo source와 package README를 2026.07.19 직접 대조
- Telemetry/write-back: 없음
