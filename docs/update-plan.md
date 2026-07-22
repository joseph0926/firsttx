# FirstTx 업데이트 계획

> 기준일: 2026.07.19
>
> 현재 제품 정의: “CSR 재방문용 visual cache + IndexedDB persistent client cache + optimistic saga”

현재 사용 중인 “SSR-level hydration”, “local-first conflict resolution”, “atomic transaction” 표현은 구현보다 앞서 있습니다. 다음 기능 릴리스 전까지 공개 계약을 실제 구현 수준으로 낮추고, correctness·security 문제를 현재 toolchain에서 먼저 해결한 뒤 major 버전을 독립적으로 업데이트합니다.

## 최우선 게이트 — Playground 신뢰성 복구

> 상태: 미완료. 이 게이트를 기존 Phase 1~5와 독립 버전 업데이트보다 먼저 완료합니다.

Playground는 두 역할을 동시에 수행해야 합니다.

1. 개발자에게 workspace package 변경이 실제 앱에 반영되었는지 즉시 검증하는 verification lab을 제공합니다.
2. OSS 사용자에게 FirstTx의 실제 동작, 한계, 측정 조건을 직접 체험하는 공개 showcase를 제공합니다.

UI/UX는 기존 topology를 다듬는 수준이 아니라 strong recomposition으로 전면 재작성합니다. 기존 section order, DOM 골격, component topology, visual language는 invariant가 아니며 현재 화면은 baseline evidence로만 보존합니다. 반면 package의 실제 content/function 계약, data shape, handler, routing, i18n, accessibility, loading/error/recovery state는 redesign 중에도 보존하거나 명시적인 approved additive contract로 관리합니다.

전면 UI 구현부터 시작하지는 않습니다. 먼저 scenario claim, metric 의미, 지원·비지원 범위, artifact provenance를 고정하고 잘못된 성공 카피를 제거합니다. 그 계약을 redesign input으로 사용해 네 설계 방향을 만들고 상위 두 후보를 격리 구현·검증한 뒤, 사용자 승인 후 production에 통합합니다. UI 통합이 끝나면 실제 화면 기준으로 contract·metric·접근성·배포를 다시 검토합니다.

현재 앱은 실제 `@firsttx/prepaint`, `@firsttx/local-first`, `@firsttx/tx` workspace package를 사용하고 핵심 Playwright E2E 20개가 통과합니다. 그러나 테스트 통과가 공개 제품 약속 충족을 의미하지 않고, 일부 시나리오와 카피가 package 계약보다 강한 보장을 주장합니다. 이 상태에서는 내부 검증 결과와 외부 홍보 메시지를 신뢰할 수 없으므로 다른 제품·toolchain 작업보다 먼저 수정합니다.

### 확인된 문제

#### 1. 공개 계약과 Playground 카피 불일치

- Tx를 “atomic”, “all-or-nothing”, “100% consistency guarantee”로 설명하지만 실제 계약은 reverse-order compensation을 수행하는 optimistic saga입니다.
- Tx는 원격 API, IndexedDB, React state를 하나의 원자적 commit으로 만들지 않으며 compensation도 실패할 수 있습니다.
- Prepaint를 “0ms loading”과 “React hydration in background”로 설명하지만 현재 구현은 snapshot을 비상호작용 Shadow DOM overlay로 표시하고 React를 빈 root에 새로 mount합니다.
- Local-First가 sync와 transaction 사이의 ordering 또는 cross-tab conflict resolution을 보장하는 것처럼 보이는 문구를 실제 구현 범위로 낮춰야 합니다.

주요 소유 위치:

- `apps/playground/src/data/scenarios.ts`
- `apps/playground/src/data/learning-paths.ts`
- `apps/playground/src/components/home/intro-section.tsx`
- `apps/playground/README.md`

#### 2. 측정 테스트가 공개 target을 판정하지 않음

2026.07.18 로컬 Chromium 실행에서 Playwright 20개는 모두 통과했지만 생성 metric은 다음과 같았습니다.

- Prepaint warm FCP: `220ms`; 홈 target: `<20ms`
- Tx concurrent: `dataConsistent: false`; 홈 fallback: `Guaranteed`
- Tx rollback: `200ms`; 시나리오 target: `<100ms`
- Instant Cart: `traditionalActionLatency: 0`; `timeSavedPerInteraction: 800.7ms`

현재 테스트는 값을 기록할 뿐 공개 target이나 invariant를 assertion으로 판정하지 않는 경우가 있습니다.

- `prepaint-heavy.spec.ts`는 warm FCP가 cold FCP보다 20ms 이상 느리지 않은지만 확인합니다.
- `tx-concurrent.metrics.spec.ts`는 `dataConsistent`를 기록하지만 `true`를 요구하지 않습니다.
- `tx-rollback.spec.ts`는 rollback 발생을 확인하지만 `<100ms` target을 요구하지 않습니다.
- `instant-cart.metrics.spec.ts`는 traditional update 완료를 기다리지 않아 action latency가 `0`인 결과도 성공으로 기록합니다.

#### 3. Timing Attack이 실제 경쟁 상태를 검증하지 않음

`apps/playground/src/pages/sync/timing.tsx`는 server sync를 `CartModel.replace()`로 직접 적용합니다. 현재 mock API 지연 때문에 transaction failure와 rollback이 끝난 뒤 server value가 적용되므로 성공이 예정된 순서입니다.

실제 브라우저 확인에서는 rollback이 약 `356ms`, server replace가 약 `1436ms`에 발생했고 시나리오는 이를 “Protected”로 판정했습니다. 또한 UI의 hardcoded 예상 수량은 `5`였지만 실제 합계는 `8`로 표시되었습니다. 이 시나리오는 Local-First의 ordering이나 conflict 처리 능력을 증명하지 않습니다.

#### 4. 대표 metric 로더가 기본 환경에서 동작하지 않음

`apps/playground/src/lib/metrics-loader.ts`는 `VITE_METRICS_BASE_URL`이 비어 있으면 동일 origin의 `/metrics/*.json`을 읽지 않고 종료합니다. 기본 로컬 실행에서 홈 대표 metric은 `--`로 남고, scenario card는 측정값 대신 `Guaranteed`, `>90%`, `~12ms` 같은 정적 fallback을 표시합니다.

측정 데이터가 없거나 오래되었거나 target을 충족하지 못한 상태를 성공 카피로 대체하지 않아야 합니다.

#### 5. 개발자와 OSS 사용자의 진입 경로가 분리되지 않음

- 첫 방문은 랜딩 대신 `/tour/problem`으로 강제 이동합니다.
- 개발자는 전체 scenario와 최근 검증 결과로 바로 이동하기 어렵습니다.
- OSS 사용자는 guided tour와 자유 탐색 중 하나를 선택할 수 없습니다.
- 한국어 모드에서도 home intro, scenario metadata, demo 본문 상당 부분이 영어로 남습니다.

#### 6. 중복 metadata와 문서 drift

router, `scenarios.ts`, `learning-paths.ts`, Playground README가 별도로 scenario 수·경로·설명·docs link를 소유합니다. 현재 README의 Sync scenario 수와 architecture tree가 실제 코드와 다르고 metrics test roadmap도 구현 상태를 반영하지 않습니다.

#### 7. correctness와 benchmark의 판정 방식이 분리되지 않음

모든 target을 같은 Playwright assertion으로 만들면 device·browser·runner 부하에 따라 변하는 성능 수치가 PR CI를 불안정하게 만들고, 반대로 unsupported behavior를 정직하게 보여주는 scenario가 실패로만 처리될 수 있습니다.

metric과 scenario outcome을 다음 세 종류로 분류합니다.

- `contract`: 현재 package가 보장하는 결정적 correctness invariant. PR CI를 차단합니다.
- `benchmark`: 환경 의존 성능 관측값. 통제된 benchmark job에서 표본·집계·회귀 budget으로 판정합니다.
- `expected-limitation`: 현재 지원하지 않는 동작 또는 알려진 한계. 한계를 정확히 재현하고 UI에 설명하면 scenario 검증은 통과할 수 있습니다.

Playground 신뢰성 게이트의 완료는 모든 scenario가 성공 상태라는 뜻이 아닙니다. 현재 package가 실패하거나 보장하지 않는 상태를 정확히 측정·표시하는 것도 완료 상태입니다.

#### 8. metric provenance와 배포 소유자가 불명확함

현재 metric artifact는 run 시각과 임의 meta만 포함하며 source commit, package build, browser/device, viewport, network profile, sample 수와 집계 방식을 추적하지 않습니다. 또한 Playground 앱은 Vercel surface를 사용하지만 metric workflow는 `public/metrics`만 GitHub Pages에 배포합니다.

- metric canonical host를 Vercel same-origin과 GitHub Pages 중 하나로 확정합니다.
- `VITE_METRICS_BASE_URL`, CORS, cache-control, stale 정책과 deploy owner를 명시합니다.
- 앱 build와 metric artifact가 같은 source revision을 가리키도록 합니다.
- 실패 run, 마지막 성공 run, stale run을 서로 다른 상태로 노출하고 원자적으로 publish합니다.

#### 9. 개발 중 workspace 변경 반영 계약이 없음

Playground 단독 `pnpm dev`는 Vite만 실행하지만 workspace package는 `dist`를 export하고 package별 watcher가 필요합니다. 루트 `pnpm dev`는 모든 package watcher를 병렬 실행하므로 공식 개발 명령과 restart 조건을 하나의 계약으로 정해야 합니다.

- package `src` 수정이 수동 build 없이 Playground에 반영되는지 smoke test로 확인합니다.
- Vite plugin처럼 dev server restart가 필요한 경계를 문서화합니다.
- Verification Lab에 commit SHA, package version 또는 build fingerprint와 build 시각을 표시합니다.
- workspace build, public npm build, stale dist를 구분할 수 있어야 합니다.

#### 10. public showcase의 fallback·접근성·배포 검증이 없음

현재 CI는 home smoke와 flagship metric 일부만 실행하고 Timing·Suspense 전용 contract test가 없습니다. Chromium 정상 경로 외의 IndexedDB/ViewTransition 미지원, metric fetch 실패, lazy route 오류와 잘못된 route도 명시적인 fallback surface가 없습니다. 한국어 전환 시 `<html lang>`이 갱신되지 않고 scenario card의 중첩 interactive element와 hover-only tooltip도 접근성 문제가 됩니다.

공개 showcase 완료에는 keyboard/focus, accessible name/state announcement, mobile reflow, reduced motion, capability fallback, error recovery, production deep-link, metadata와 docs link 검증을 포함합니다.

### 실행 순서

#### P0-A. 계획 상태와 scenario 처분표 확정

> 상태: 2026.07.19 확정. [`docs/playground-contract.md`](./playground-contract.md)의 P0-A table이 canonical disposition을 소유합니다. `current-contract` 5개, `expected-limitation` 2개, `demo-rewrite` 2개이며 package 수정 선행이나 공개 제거 항목은 없습니다.

- 기존 Phase의 완료·미완료 상태와 evidence 날짜를 현재 source에 맞게 정리합니다.
- 모든 공개 scenario를 `current-contract`, `expected-limitation`, `demo-rewrite`, `package-fix-first`, `remove-until-supported` 중 하나로 분류합니다.
- 각 scenario의 actor/job, package contract, claim owner, metric kind, test owner와 공개 여부를 표로 고정합니다.
- package 기능 수정이 필요한 항목과 Playground 설명·구현만 수정할 항목을 분리합니다.

#### P0-B. 공개 계약 정렬과 즉시 오해 방지

> 상태: 2026.07.19 공개 화면 1차 정렬 완료. 홈, 검증 기준, 공통 시나리오 프레임과 9개 시나리오에서 근거 없는 `0ms`, 원자성, 고정 성공률 표현을 제거하고 관찰값·현재 계약·알려진 한계 중심으로 교체했습니다. 한국어 디스플레이 타이포그래피와 루트·한국어·Playground README도 현재 화면에 맞췄습니다. 시나리오 동작과 런타임 측정 연결은 P0-E~F에 남아 있습니다.

- Playground의 모든 product claim을 package README와 docs MDX의 현재 계약에 맞춥니다.
- “atomic”, “guaranteed”, “100%”, “0ms”는 실제로 증명되는 조건과 실행 환경이 있을 때만 사용합니다.
- Prepaint의 overlay replay와 React mount를 hydration과 구분합니다.
- 제한 사항과 실패 가능성을 각 scenario의 Problem/Solution/Expected Behavior에 함께 표시합니다.
- metric 부재·만료·실패 시 정적 성공 수치를 표시하지 않고 `Not measured`, `Stale`, `Failed`, `Unsupported`로 구분합니다.

#### P0-C. metric protocol, contract registry와 판정 게이트

> 상태: 2026.07.19 분류·protocol 확정. [`docs/playground-contract.md`](./playground-contract.md)의 metric catalog와 `apps/playground/src/data/playground-contract.ts`가 scenario·metric kind를 소유합니다. Runtime artifact schema, legacy key migration, loader와 CI 판정 구현은 P0-E~F에 남아 있습니다.

- 각 metric에 측정 시작·종료 event, cold/warm 조건, unit, sample 수, 집계 방식, 허용 환경, metric kind와 owner를 정의합니다.
- `contract`는 deterministic assertion으로, `benchmark`는 통제된 runner의 median/p95와 regression budget으로, `expected-limitation`은 기대 실패 상태로 판정합니다.
- FCP를 blank interval로, handler 실행 시간을 optimistic paint로 간주하지 않고 실제 product event와 paint boundary에 맞는 metric으로 교체합니다.
- scenario id, route, package, copy key, claim type, metric schema, docs link와 test owner를 browser-safe contract registry에서 관리합니다.
- locale copy와 route implementation은 contract registry와 분리하고 consistency test로 연결합니다.
- UI에 표시하는 metric key와 Playwright가 생성하는 key를 같은 schema에서 검증합니다.
- 실패하거나 오래된 metric을 `Live`로 표시하지 않습니다.
- 측정값이 없을 때 성공 수치 대신 `Not measured`와 실행 방법을 표시합니다.
- metric artifact에 `scenarioVersion`, source commit SHA, app/package version, browser/OS, viewport, network profile, sample 수, aggregation, measuredAt, status와 source artifact를 포함합니다.

#### P0-D. UI/UX 전면 재설계 방향 확정 — strong recomposition

> 상태: 2026.07.19 Proof Atlas visual/IA를 base로 Signal Desk 검증 구조를 합성하는 방향 승인·production 통합 완료. `/`, `/lab`, guided tour shell과 공개 scenario contract receipt를 교체했고 candidate-only route·fixture는 제거했습니다. Decision packet은 [`docs/uiux/playground-redesign.md`](./uiux/playground-redesign.md)가 소유합니다.

- `docs/uiux/playground-redesign.md` decision packet을 만들고 이 문서의 Playground gate를 acceptance source로 연결합니다.
- 현재 home/tour/scenario/metrics surface의 desktop·mobile, 한국어·영어, 대표 상태를 baseline으로 캡처합니다.
- 기존 topology를 보존하지 않는 IA/layout/component composition 네 방향을 설계합니다.
- Product fit, hierarchy, feasibility, mobile/state 확장성으로 상위 두 후보만 target repo의 격리 preview route에 구현합니다.
- 두 후보는 P0-C의 contract registry와 metric fixture를 사용하며 기존 UI component topology를 재사용 조건으로 두지 않습니다.
- 두 후보의 desktop/mobile, loading/empty/error/failure/stale/unsupported, locale/theme evidence를 캡처하고 score합니다.
- `select-one` 또는 `synthesize` final direction과 선택·기각 근거를 제시한 뒤 사용자 명시 승인을 받습니다.
- 승인 전에는 production route를 교체하지 않고, 승인된 data/state 요구사항을 이후 기술 구현의 UI contract로 사용합니다.

#### P0-E. metric loader, artifact publish와 CI 흐름 수정

> 상태: 2026.07.22 `sync-staleness` vertical slice 구현 완료, P0-E 전체는 진행 중. GitHub Pages를 canonical metric host로 확정하고 schema v1 artifact·manifest, source/freshness 판정 loader, `/lab` current/last-success 상태, PR contract gate, 실패 run 게시 뒤 CI 실패 복원, Pages atomic deploy와 post-deploy source/deep-link smoke를 연결했습니다. Node 24 contract test 13개, Playground와 Playwright source typecheck, lint와 격리 publisher 실행이 통과했습니다. 실제 `main` Pages 배포와 production smoke는 아직 관찰하지 않았고 나머지 8개 scenario는 `not-measured` 또는 legacy이므로 P0-E를 완료로 닫지 않습니다.

- canonical metric host와 app/metric deploy owner를 확정합니다.
- same-origin 또는 cross-origin 경로, CORS, cache-control, stale cutoff와 fallback을 테스트합니다.
- CI에서 scenario metric 생성 → schema 검증 → 판정 → public artifact atomic publish를 하나의 재현 가능한 흐름으로 만듭니다.
- 실패 run이 마지막 성공 run에 가려지지 않게 current run status와 last successful run을 분리합니다.
- PR에서는 correctness contract를 차단하고 benchmark는 통제된 job에서 추세를 판정합니다.
- production URL에서 source revision, freshness와 deep-link를 확인하는 post-deploy smoke를 추가합니다.

#### P0-F. 대표 scenario를 deterministic하게 재구현

- Timing Attack을 실제로 순서를 제어할 수 있는 deterministic scheduler 또는 deferred promise 기반으로 재작성합니다.
- transaction patch, rollback, server replacement interleaving은 package/unit integration test가 소유하고 E2E는 대표 흐름을 검증합니다.
- Instant Cart는 initial load, optimistic paint, server acknowledgement를 서로 다른 metric으로 분리합니다.
- Concurrent Tx는 지원하는 동시성 계약만 보여주고 unsupported guarantee를 제거합니다.
- 무작위 failure는 seeded sequence로 바꾸고 correctness test에서는 virtual clock 또는 deferred gate를 사용합니다.
- 각 scenario는 독립 model namespace, mock server reset과 cleanup을 사용해 이전 scenario의 IndexedDB·timer·listener state에 영향을 받지 않게 합니다.
- persistence 자체가 user job인 scenario는 reset 경계와 의도적으로 보존되는 state를 명시합니다.

#### P0-G. 개발자 verification loop 고정

- 공식 개발 명령과 package watcher 범위를 문서화합니다.
- package source 변경이 Playground에 반영되는 smoke와 Vite plugin restart 경계를 검증합니다.
- 특정 scenario를 URL로 직접 열고 deterministic state로 reset·재실행할 수 있게 합니다.
- Verification Lab이 현재 source/build fingerprint와 stale dist를 식별할 수 있게 합니다.

#### P0-H. 승인된 UI production 통합

> 상태: 2026.07.19 core surface 통합 완료. Dual-entry home, `/lab`, 공통 scenario contract receipt, KO/EN `<html lang>`, light/dark, 390px reflow와 candidate cleanup을 반영했습니다. Runtime artifact·reset, capability/lazy-route/404 recovery, metadata와 screen-reader service flow는 P0-E~I에서 계속합니다.

- 첫 화면에서 `5분 체험`과 `Verification Lab`을 동등한 선택지로 제공하고 첫 방문 강제 redirect를 제거합니다.
- Verification Lab에는 package, scenario, 최근 run, 환경, metric kind, target/budget, status, source/test link와 build fingerprint를 표시합니다.
- 승인된 final direction만 production route에 통합하고 candidate-only route, fixture, registry와 style scope를 제거합니다.
- 한국어·영어에서 핵심 home, scenario instructions, 결과 문구와 `<html lang>`이 일치하게 합니다.
- semantic role, keyboard path, focus-visible, touch target, reduced motion, zoom/reflow와 screen-reader task flow를 검증합니다.
- IndexedDB/ViewTransition 미지원, metric fetch 실패, lazy route 오류, 404에 recovery surface를 제공합니다.
- title, description, OG/share metadata와 docs link를 공개 showcase 기준으로 정리합니다.

#### P0-I. registry·문서·coverage와 배포 최종 정합성

- router, home/tour/navigation, README와 E2E가 contract registry와 일치하는지 검사합니다.
- 모든 공개 scenario가 최소 하나의 contract/limitation test와 연결되는 coverage ledger를 닫습니다.
- Playground README와 tests README를 실제 실행 명령, metric host와 구현 상태에 맞춥니다.
- production deploy smoke 뒤 UI 기준으로 contract·metric·접근성·locale·mobile을 다시 검토합니다.
- decision packet을 acceptance evidence와 함께 `verified`로 닫습니다.

### 완료 조건

- 모든 공개 scenario의 처분, metric kind, claim owner와 test owner가 결정되어 있습니다.
- Playground의 공개 문구가 package README와 docs MDX의 현재 계약과 상충하지 않습니다.
- `atomic`, `guaranteed`, `100%`, `0ms`, `hydration` 검색 결과가 승인된 문맥과 측정 조건에만 존재합니다.
- 대표 metric의 UI key, artifact key, test key와 provenance가 schema 검증을 통과합니다.
- `contract` invariant 실패는 CI를 차단하고 `benchmark`는 통제된 환경의 regression 결과로 분리됩니다.
- `expected-limitation` scenario는 실제 한계와 UI 설명이 일치하면 검증을 통과할 수 있습니다.
- Timing Attack은 rollback 전·중·후 server replacement interleaving을 package/integration test로 재현하고 E2E 대표 흐름에서 기대 snapshot을 검증합니다.
- Instant Cart는 traditional action 완료를 기다린 뒤 action latency를 기록하며 `0`을 미측정 값으로 성공 처리하지 않습니다.
- metric 부재·만료·실패 상태가 정적 성공 fallback으로 대체되지 않습니다.
- metric artifact와 앱 build의 source revision·package version·환경·freshness가 사용자에게 표시됩니다.
- 공식 dev command에서 package source 변경이 수동 build 없이 Playground에 반영되고 restart 경계가 문서화됩니다.
- 신규 방문자가 강제 투어 없이 guided tour와 Verification Lab을 선택할 수 있습니다.
- 한국어와 영어에서 핵심 사용자 여정에 언어 혼용이 없습니다.
- `docs/uiux/playground-redesign.md`에 baseline, 네 방향, 구현한 두 후보, capture manifest, score, final approval과 acceptance trace가 남습니다.
- 승인된 final direction만 production에 통합되고 candidate-only code가 남지 않습니다.
- loading/empty/error/failure/stale/unsupported와 keyboard/focus/mobile/reduced-motion/locale state evidence가 있습니다.
- scenario registry와 router, README, E2E coverage ledger의 일치 검사가 통과합니다.
- metric canonical host, cache/stale 정책과 atomic publish가 문서화되고 production smoke가 통과합니다.
- `pnpm --filter playground typecheck`, `lint`, `build`, 전체 Playwright E2E가 통과합니다.
- 변경된 package 계약이 있다면 해당 package unit/regression test와 Changeset까지 포함합니다.

### 범위 제한

- 이 게이트는 Playground가 현재 package 계약을 정확히 검증하고 설명하도록 만드는 작업입니다.
- Local-First CAS/conflict resolution, Tx의 새로운 동시성 모드, Prepaint의 새로운 성능 보장은 이 게이트에서 새로 구현하지 않습니다.
- 제품 기능이 없어서 scenario claim을 충족할 수 없다면 기능을 추측해 추가하지 않고 claim과 scenario를 현재 지원 범위로 낮춥니다.
- Playground UI의 IA, section order, component topology와 visual language는 전면 재작성 범위입니다.
- package data shape, handler, routing semantics와 실제 behavior는 UI redesign만을 이유로 변경하지 않습니다.
- final UI direction 승인 전에는 production route를 교체하지 않습니다.

### 계획 문서 정합성 유지

- 이 문서의 상태·검증 기록에는 evidence 날짜와 source revision을 남기고 일회성 “현재” 표현을 피합니다.
- 기존 Phase를 시작하기 전에 이미 구현된 항목과 남은 검증을 source 기준으로 다시 분류합니다.
- Playground gate의 각 P0 단계는 decision packet 또는 coverage ledger에 상태와 evidence를 갱신합니다.

## 실행 원칙

- P0 correctness·security와 공개 계약 수정을 major toolchain 업데이트보다 먼저 처리합니다.
- Local-First의 CAS/revision 충돌 해결처럼 새로운 제품 기능은 현재 결함 수정과 분리합니다.
- 공개 API, 기본 동작, wire protocol 변경에는 Changeset과 migration note를 포함합니다.
- 각 major 업데이트는 하나의 독립 변경으로 진행하고 이전 단계의 검증 기준을 그대로 재실행합니다.
- `pnpm`, Vite, TypeScript, ESLint major가 섞인 상태에서 runtime 결함을 수정하지 않습니다.

## Phase 0 — 즉시 공개 계약 정정

코드 변경과 무관하게 먼저 README, package description, docs MDX, AI/RAG source 문서의 표현을 실제 구현에 맞춥니다.

> 상태: 2026.07.14 문서 source 정정 완료. README, package metadata, 한국어·영어 docs, 페이지 metadata, AI source와 RAG system prompt를 같은 계약으로 정렬했습니다. 다만 2026.07.18 재검토에서 Playground 카피·scenario·metric 판정은 여전히 현재 package 계약과 어긋나는 부분이 확인되어 위 최우선 게이트가 제품 전체의 남은 Phase 0을 소유합니다. Changelog의 과거 기록과 `HydrationError`·`hydration.error` 같은 현행 API/event 이름은 유지하고, direct-restore hydration 설명에는 legacy 구현임을 표시했습니다. 외부 Redis/Vector namespace를 변경하는 RAG 재색인은 이 문서 변경 범위에 포함하지 않았습니다.

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

### 1-A. hydration 경로 제거 — 구현 완료, release gate 재검증 필요

2026.07.19 source 재확인 결과 `packages/prepaint/src/helpers.ts`는 React를 빈 container에 `createRoot()`로 mount하고 snapshot을 별도 Shadow DOM overlay에 유지한 뒤 첫 commit 후 제거합니다. direct-restore `hydrateRoot()` 경로 제거와 Fragment·복수 root 지원은 구현되어 있으며, 아래 항목은 release 전 regression·migration gate로 유지합니다.

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
- Playground Chromium E2E: 2026.07.18 로컬 20개 통과. contract/benchmark 판정 누락으로 metric 결과는 Playground 신뢰성 근거로 아직 승인하지 않습니다.
- 실제 packed-consumer matrix: 미실행

현재 단위 테스트 통과는 기존 동작이 올바르다는 의미가 아닙니다. root child를 1개로 되돌리는 Prepaint 테스트와 동시 요청 결과 `[3, 3, 3]`을 성공으로 간주하는 Tx 테스트처럼 수정 대상 동작을 현재 계약으로 고정한 사례가 있으므로, 각 phase에서 회귀 테스트의 기대값도 함께 교체합니다.

## 탐색 범위

주요 source, 테스트, package manifest와 lockfile, 공개 문서 계약, CI·release 설정을 직접 확인했습니다. 전체 UI 컴포넌트와 운영 로그는 전수 감사 범위에서 제외했습니다.
