# Playground scenario·metric 계약

> 상태: 확정
>
> 확정일: 2026.07.19
>
> 기준 source: `df1e923d531a` + 문서·격리 preview 작업 트리
>
> 소유 단계: `docs/update-plan.md`의 P0-A, P0-C

이 문서는 Playground가 보여 줄 9개 공개 시나리오의 처분과 metric 판정 계약을 고정합니다. UI copy, scenario registry, Playwright, metric artifact와 공개 문서는 이 계약을 소비하며 서로 독립적으로 더 강한 보장을 만들지 않습니다.

## 판정 어휘

### Scenario disposition

- `current-contract`: 현재 package 계약을 결정적으로 재현할 수 있습니다. 과장된 copy만 계약에 맞춥니다.
- `expected-limitation`: 현재 지원하지 않는 동작을 결정적으로 재현하고 한계를 설명하면 통과합니다.
- `demo-rewrite`: package 기능은 존재하지만 현재 demo나 측정법이 해당 기능을 증명하지 못합니다. 공개 전 demo를 다시 작성합니다.
- `package-fix-first`: package correctness 수정 없이는 정직한 공개 시나리오를 만들 수 없습니다.
- `remove-until-supported`: 사용자에게 유효한 동작이나 한계 어느 쪽도 검증할 수 없어 지원 시점까지 공개하지 않습니다.

### Metric kind

- `contract`: 현재 package의 결정적 correctness invariant입니다. 실패하면 PR merge를 차단합니다.
- `benchmark`: runner·browser·device·network에 의존하는 관찰값입니다. 통제된 benchmark job에서만 회귀를 판정합니다.
- `expected-limitation`: 지원하지 않는 계약을 기대 상태로 확인합니다. 예상한 제한을 재현하면 scenario는 통과합니다.

모든 scenario가 green이어야 완료되는 것이 아닙니다. `expected-limitation`을 정확히 재현하고 사용자에게 같은 의미로 설명한 상태도 완료입니다.

## P0-A — Scenario disposition table

| Canonical ID               | Route                       | Actor / user job                                                          | 현재 package 계약                                                                                                          | Disposition           | Metric kind                     | Claim owner                              | Test owner                                                    | 공개 조건                                                                                              |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------- | ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `prepaint-heavy`           | `/prepaint/heavy`           | OSS 사용자가 재방문 시 visual snapshot replay와 React handoff를 확인      | 유효한 allowlist snapshot이 있으면 비상호작용 Shadow DOM overlay를 먼저 표시하고 React는 빈 root에 `createRoot()`로 mount  | `demo-rewrite`        | contract + benchmark            | contract registry, `heavy.page.tsx`      | `prepaint-handoff.spec.ts`, 재작성할 `prepaint-heavy.spec.ts` | FCP를 blank time으로 부르는 측정과 `0ms`, DOM reuse 주장을 제거한 뒤 공개                              |
| `prepaint-route-switching` | `/prepaint/route-switching` | 개발자가 route별 capture·restore 경계를 확인                              | exact pathname allowlist에 따라 route별 schema v2 snapshot을 capture·restore·prune                                         | `current-contract`    | contract + benchmark            | contract registry, `route-switching.tsx` | `prepaint-route-switching.spec.ts`                            | 실제 child route 4개와 policy를 같은 registry에서 읽고 smooth 보장을 관찰값으로 낮춘 뒤 공개           |
| `sync-instant-cart`        | `/sync/instant-cart`        | OSS 사용자가 optimistic paint와 server acknowledgement 차이를 비교        | `useTx`가 optimistic callback을 먼저 실행하고 request 실패 시 전달된 snapshot으로 rollback callback을 실행                 | `demo-rewrite`        | contract + benchmark            | contract registry, `instant-cart.tsx`    | 재작성할 contract test, `instant-cart.metrics.spec.ts`        | input→paint와 server ack를 분리하고 traditional 완료를 실제로 기다린 뒤 공개                           |
| `sync-timing`              | `/sync/timing`              | 개발자가 transaction과 외부 server replacement의 interleaving 한계를 확인 | Local-First manual `replace()`와 Tx rollback 사이의 ordering·conflict resolution은 통합 보장하지 않음                      | `expected-limitation` | expected-limitation             | contract registry, `timing.tsx`          | 신규 `sync-timing.contract.spec.ts`                           | deferred scheduler로 replace-before/during/after rollback을 재현하고 보호됨·100% copy를 제거한 뒤 공개 |
| `sync-staleness`           | `/sync/staleness`           | OSS 사용자가 TTL과 `syncOnMount` 전략을 비교                              | `history.isStale`과 `always/stale/never` mount sync 조건을 제공                                                            | `current-contract`    | contract                        | contract registry, `staleness.tsx`       | `sync-staleness.spec.ts`                                      | demo TTL과 실제 model TTL, stale 시각을 표시한 뒤 공개                                                 |
| `sync-suspense`            | `/sync/suspense`            | 개발자가 cache-first Suspense 흐름을 확인                                 | 첫 방문은 fallback 후 data, fresh cache는 즉시 data, stale cache는 data를 반환하고 background revalidate                   | `current-contract`    | contract                        | contract registry, `suspense-demo.tsx`   | 신규 `sync-suspense.contract.spec.ts`                         | first/fresh/stale/error fixture와 Error Boundary recovery를 추가한 뒤 공개                             |
| `tx-concurrent`            | `/tx/concurrent`            | 개발자가 같은 `useTx` hook을 겹쳐 호출할 때의 현재 상태 경계를 확인       | 각 `mutateAsync`는 별도 `Transaction`을 만들지만 hook의 pending/error/success와 cancel controller는 호출별로 격리되지 않음 | `expected-limitation` | expected-limitation + benchmark | contract registry, `concurrent.tsx`      | 신규 `tx-concurrent.limitation.spec.ts`, metrics test         | atomic·guaranteed·throughput target을 제거하고 shared hook state/cancel 한계를 재현한 뒤 공개          |
| `tx-rollback-chain`        | `/tx/rollback-chain`        | OSS 사용자가 완료 step의 reverse-order compensation을 확인                | 실패 전 완료된 step의 compensation을 역순 실행하며 compensation 자체는 실패할 수 있음                                      | `current-contract`    | contract + benchmark            | contract registry, `rollback-chain.tsx`  | `tx-rollback.spec.ts`                                         | state 복원과 compensation order를 contract로, duration을 benchmark로 분리한 뒤 공개                    |
| `tx-network-chaos`         | `/tx/network-chaos`         | OSS 사용자가 retry·backoff·exhaustion rollback을 확인                     | 설정한 max attempts와 backoff로 step을 재시도하고 소진 시 완료 step을 compensate                                           | `current-contract`    | contract + benchmark            | contract registry, `network-chaos.tsx`   | `tx-network-chaos.spec.ts`                                    | seeded failure sequence를 사용하고 고정 success-rate 홍보 수치를 제거한 뒤 공개                        |

확정 결과는 `current-contract` 5개, `expected-limitation` 2개, `demo-rewrite` 2개입니다. `package-fix-first`와 `remove-until-supported`는 없습니다. Timing·Concurrent에서 새 보장을 만들려면 별도 package proposal과 승인된 contract 변경이 필요합니다.

## P0-C — 공통 metric protocol

### Event와 paint 경계

- 시간 metric의 clock은 같은 page context의 monotonic clock을 사용합니다.
- `FCP`는 페이지의 첫 contentful paint일 뿐 blank interval이나 snapshot replay 완료의 대체값으로 쓰지 않습니다.
- optimistic latency의 끝은 handler return이 아니라 다음 animation frame에서 기대 DOM state가 실제 paint 대상이 된 시점입니다.
- server acknowledgement는 request promise가 settle된 시점이며 optimistic paint와 별도 기록합니다.
- Prepaint의 contract는 `overlay-visible < react-first-commit <= overlay-removed` event order로 판정합니다.
- Tx duration과 correctness를 분리합니다. state 복원·compensation order는 contract이고 duration은 benchmark입니다.

### Sample과 aggregation

- `contract`: 독립 model namespace, reset된 storage, seeded fixture 또는 deferred gate에서 1회 이상 실행하며 모든 assertion이 통과해야 합니다. retry로 성공을 덮지 않습니다.
- `expected-limitation`: 지원하지 않는 상태를 고정 fixture로 최소 1회 재현하고 관찰값·설명·테스트 기대값이 모두 같아야 합니다.
- `benchmark`: 3회 warm-up 후 20 measured samples를 수집하고 `median`과 `p95`를 게시합니다. raw samples와 실패 sample 수를 artifact에 남깁니다.
- benchmark baseline이 승인되기 전에는 절대 target을 홍보하지 않습니다. 승인 후 동일 runner에서 median 15% 초과 또는 p95 20% 초과 회귀가 3회 연속 발생하면 `degraded`로 판정합니다.

### 환경과 freshness

- correctness 기본 gate는 현재 CI와 같은 Desktop Chromium입니다. capability fallback contract는 해당 capability를 강제로 비활성화한 별도 project가 소유합니다.
- benchmark 환경은 browser/version, OS/runner, viewport, DPR, CPU/network profile을 완전히 일치시킵니다. 다른 환경 결과는 비교하지 않습니다.
- app build와 metric artifact의 source revision이 다르면 즉시 `stale`입니다.
- contract artifact는 24시간, benchmark artifact는 7일을 넘으면 `stale`입니다. stale 값은 화면에 남길 수 있지만 `Live`나 현재 통과로 표시하지 않습니다.

## Metric catalog

| Metric ID                             | Scenario                 | Kind                | Start → end / condition                                                               | Unit                         | Samples / aggregation         | Verdict                                               | Owner                                   |
| ------------------------------------- | ------------------------ | ------------------- | ------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------- | ----------------------------------------------------- | --------------------------------------- |
| `overlay-before-first-commit`         | prepaint-heavy           | contract            | warm boot의 `overlay-visible` → `react-first-commit` → `overlay-removed` event order  | boolean + ordered events     | deterministic run / all       | 정확한 순서와 overlay non-interactive가 모두 참       | `prepaint-handoff.spec.ts`              |
| `time-to-first-visual-ms`             | prepaint-heavy           | benchmark           | navigation start → overlay 또는 React app 중 먼저 유효한 visual state가 paint된 frame | ms                           | 20 / median,p95               | baseline 대비 회귀만 판정                             | `prepaint-heavy.spec.ts`                |
| `route-snapshot-coverage`             | prepaint-route-switching | contract            | 4개 child route 방문 완료 → 유효한 schema v2 snapshot key 확인                        | count + boolean              | deterministic run / exact     | allowlist child route `4/4`                           | `prepaint-route-switching.spec.ts`      |
| `route-restore-to-interactive-ms`     | prepaint-route-switching | benchmark           | warm child-route navigation start → React control이 keyboard 입력을 받는 시점         | ms                           | 20 / median,p95               | baseline 대비 회귀만 판정                             | 신규 route benchmark test               |
| `optimistic-paint-precedes-ack`       | sync-instant-cart        | contract            | increment input → optimistic DOM paint → request settle                               | boolean + ordered events     | deterministic run / all       | paint가 ack보다 먼저이며 실패 fixture는 snapshot 복원 | 신규 instant-cart contract test         |
| `input-to-optimistic-paint-ms`        | sync-instant-cart        | benchmark           | increment input timestamp → 기대 quantity가 paint된 animation frame                   | ms                           | 20 / median,p95               | baseline 대비 회귀만 판정                             | `instant-cart.metrics.spec.ts`          |
| `server-ack-ms`                       | sync-instant-cart        | benchmark           | increment input timestamp → request promise settle                                    | ms                           | 20 / median,p95               | 관찰값, correctness 판정 금지                         | `instant-cart.metrics.spec.ts`          |
| `traditional-input-to-paint-ms`       | sync-instant-cart        | benchmark           | traditional increment input → request 성공 후 quantity paint                          | ms                           | 20 / median,p95               | 완료 전 `0` 기록 금지                                 | `instant-cart.metrics.spec.ts`          |
| `external-replace-ordering-supported` | sync-timing              | expected-limitation | replace가 rollback 전·중·후 도착하도록 gate → 각 final snapshot                       | boolean + enum               | 3 fixed interleavings / exact | `false`; 실제 final snapshot과 설명이 fixture와 일치  | 신규 `sync-timing.contract.spec.ts`     |
| `stale-mount-triggers-sync`           | sync-staleness           | contract            | stale record로 mount → fetcher invocation과 fresh history                             | boolean                      | deterministic run / all       | fetch 1회, `isStale=false`                            | `sync-staleness.spec.ts`                |
| `never-mount-skips-sync`              | sync-staleness           | contract            | stale record를 `never`로 mount → manual sync 전                                       | boolean                      | deterministic run / all       | auto fetch 0회, manual trigger 후 1회                 | `sync-staleness.spec.ts`                |
| `first-visit-fallback-then-data`      | sync-suspense            | contract            | empty storage mount → Suspense fallback → resolved data                               | ordered events               | deterministic run / all       | fallback과 data 순서 일치                             | 신규 `sync-suspense.contract.spec.ts`   |
| `fresh-cache-skips-fallback`          | sync-suspense            | contract            | fresh cache mount → first committed state                                             | boolean                      | deterministic run / all       | data 즉시 표시, network fetch 0회                     | 신규 `sync-suspense.contract.spec.ts`   |
| `shared-hook-run-isolation`           | tx-concurrent            | expected-limitation | 같은 hook에서 중첩 mutate와 한 호출 cancel → 호출별 상태 관찰                         | boolean + events             | fixed overlap / exact         | `false`; shared state/controller 한계를 그대로 표시   | 신규 `tx-concurrent.limitation.spec.ts` |
| `batch-completion-rate`               | tx-concurrent            | benchmark           | seeded batch launch → 모든 promise settle                                             | percentage                   | 20 batches / median,p95       | workload 관찰값, package 성공 보장으로 사용 금지      | `tx-concurrent.metrics.spec.ts`         |
| `batch-duration-ms`                   | tx-concurrent            | benchmark           | seeded batch launch → 모든 promise settle                                             | ms                           | 20 / median,p95               | baseline 대비 회귀만 판정                             | `tx-concurrent.metrics.spec.ts`         |
| `compensation-order-lifo`             | tx-rollback-chain        | contract            | step failure → compensation event sequence                                            | ordered step IDs             | deterministic run / exact     | 완료 step ID의 역순과 정확히 일치                     | `tx-rollback.spec.ts`                   |
| `original-state-restored`             | tx-rollback-chain        | contract            | transaction 시작 snapshot → rollback 완료 snapshot                                    | boolean                      | deterministic run / all       | compensation 성공 fixture에서 deep equal              | `tx-rollback.spec.ts`                   |
| `rollback-duration-ms`                | tx-rollback-chain        | benchmark           | `rollback.start` → `rollback.success`                                                 | ms                           | 20 / median,p95               | `<100ms` 고정 홍보 금지, 회귀만 판정                  | `tx-rollback.spec.ts`                   |
| `retry-attempt-sequence`              | tx-network-chaos         | contract            | 첫 request → 성공 또는 RetryExhaustedError                                            | attempt IDs + delay schedule | seeded fixture / exact        | max attempts와 backoff schedule 일치                  | `tx-network-chaos.spec.ts`              |
| `rollback-on-retry-exhaustion`        | tx-network-chaos         | contract            | retry exhaustion → rollback 완료                                                      | boolean + state snapshot     | seeded failure / all          | 이전 snapshot 복원 또는 compensation failure 명시     | `tx-network-chaos.spec.ts`              |
| `network-operation-duration-ms`       | tx-network-chaos         | benchmark           | scenario launch → terminal state                                                      | ms                           | 20 / median,p95               | 설정별 관찰값, success-rate target으로 사용 금지      | `tx-network-chaos.spec.ts`              |

## Artifact와 UI 상태 계약

모든 artifact는 아래 provenance를 포함합니다.

- `schemaVersion`, `scenarioVersion`, `runId`
- source commit SHA와 dirty 여부
- app version, 세 package version·build fingerprint
- browser/version, OS/runner, viewport, DPR, CPU/network profile
- warm-up 수, measured sample 수, aggregation, raw artifact 경로
- `measuredAt`, `currentStatus`, `lastSuccessfulRunId`

UI status는 `passed`, `failed`, `expected-limitation`, `not-measured`, `stale`, `unsupported`만 사용합니다. `Live`는 source revision과 freshness가 모두 현재이고 run이 실제로 진행 중일 때만 사용합니다. 값이 없거나 fetch가 실패했을 때 정적 성공 수치로 대체하지 않습니다.

## Registry와 copy 경계

- Browser-safe contract registry가 canonical ID, route, package, disposition, claim type, metric ID, docs link와 test owner를 소유합니다.
- locale copy는 registry에서 분리하되 모든 canonical ID와 공개 상태를 consistency test로 대조합니다.
- route component는 fixture 실행과 결과 표시를 소유하며 새로운 product claim을 직접 만들지 않습니다.
- README와 UI는 registry에서 계산한 scenario 수를 사용합니다.
- 기존 metric key는 새 catalog key로 migration하기 전까지 `legacy`로만 읽고 공개 status 판정에는 사용하지 않습니다.

## 후속 범위

P0-A와 metric 분류는 확정했습니다. 2026.07.22 P0-E vertical slice에서 GitHub Pages를 canonical metric host로 확정하고 `sync-staleness` schema v1 artifact·manifest·loader·Lab 연결, 실패 run 게시와 last-success 계승, Pages publish workflow를 구현했습니다. 실제 `main` 배포 관찰과 나머지 scenario 전환은 아직 남아 있습니다.

- 나머지 scenario의 schema v1 artifact 전환과 production post-deploy 확인: P0-E
- deterministic scheduler와 scenario fixture 구현: P0-F
- workspace build fingerprint 생성 방식: P0-G
- 승인된 UI의 production 통합과 locale copy: P0-H
