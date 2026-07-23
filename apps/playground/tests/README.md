# Playground Playwright Tests

이 디렉터리는 공개 시나리오의 동작 검사와 브라우저 측정값 수집을 함께 소유합니다. 테스트 통과와 성능 보장은 같은 의미가 아닙니다.

- 결정적인 동작은 assertion으로 판정합니다.
- 브라우저 성능값은 `.metrics/*.latest.json`에 관찰 결과로 저장합니다.
- 알려진 한계는 한계가 재현되고 공개 설명과 일치하는지를 검사합니다.

## Regression guard 계약

확인된 버그, false-green, expected-limitation 오판을 수정하거나 재발 방지를 요청받은 테스트에 적용합니다. 새 happy path, benchmark 관찰값 수집, 외형 변경만 다루는 테스트에는 적용하지 않습니다.

Regression guard는 다음 evidence를 함께 가져야 합니다.

1. **Counterexample 선행**: 회귀 보완을 시작하기 전에 수정 전 구현이 허용한 구체적인 입력·event sequence·state transition과 잘못된 관찰 결과를 특정합니다. 추상적인 위험이나 수정 후 기대 결과만으로 counterexample을 대신하지 않습니다.
2. **Failure witness**: 특정한 counterexample을 실행하거나 동등하게 주입했을 때 수정 전 동작에서 어떤 assertion 또는 타입 검사가 실패하는지 설명합니다. 같은 테스트의 fail-before/pass-after, 이전 호출을 거부하는 타입 경계, 또는 동등한 negative fixture·mutant를 사용할 수 있습니다. counterexample을 거부하지 않고 수정 후 성공 경로나 원하는 최종 상태만 확인하는 positive-only assertion은 failure witness가 아닙니다.
3. **Coverage 보존**: 새 회귀 사례가 기존의 독립 contract·limitation assertion을 대체하지 않습니다. 목적이 다르면 테스트를 분리합니다.
4. **Deterministic control**: correctness는 deferred gate, fixed seed, virtual clock 또는 exact event/state assertion으로 판정합니다. 정확한 제어 수단이 있는데 wall-clock timeout으로 의미를 대신하지 않습니다.
5. **검증 증거**: 수정된 guard, 관련 독립 계약, typecheck·lint 중 영향 범위에 해당하는 검사를 실행하고 환경과 정확한 통과 개수를 보고합니다.

구체적인 counterexample을 특정할 수 없으면 회귀 guard를 변경하지 않습니다. 대신 미확인 위험과 counterexample 재현에 필요한 조건만 보고하고 종료합니다.

완료 보고에는 특정한 counterexample, 이전 구현이 보인 결과, 이를 거부하는 guard, 보존한 기존 coverage를 포함합니다. dirty worktree를 되돌려 failure witness를 만들지 않으며, 현재 source 대조나 안전한 negative fixture로 증명합니다.

## 현재 테스트

| 파일                               | 범위                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| `home.smoke.spec.ts`               | 홈, 투어 진입, 검증 기준, 모바일 reflow                           |
| `prepaint-handoff.spec.ts`         | Prepaint 오버레이와 React 전환 계약                               |
| `prepaint-heavy.spec.ts`           | Heavy Page의 cold/warm 브라우저 측정                              |
| `prepaint-route-switching.spec.ts` | 경로별 방문·측정·서버 동기화                                      |
| `instant-cart.metrics.spec.ts`     | 요청 우선 방식과 낙관적 반영의 측정값                             |
| `sync-staleness.spec.ts`           | stale/never mount 계약과 schema v1 artifact                       |
| `sync-timing.contract.spec.ts`     | replace-before/during/after rollback의 고정 interleaving          |
| `instant-cart.contract.spec.ts`    | optimistic paint, acknowledgement, rejection rollback의 고정 순서 |
| `metric-artifact.test.ts`          | artifact·manifest·loader 경계                                     |
| `tx-concurrent.limitation.spec.ts` | seeded overlap 결과와 shared cancel limitation                    |
| `tx-concurrent.metrics.spec.ts`    | 겹치는 호출의 결과와 공유 상태 측정                               |
| `tx-rollback.spec.ts`              | 실패 뒤 역순 보상 처리                                            |
| `tx-network-chaos.spec.ts`         | 고정 실패 사례의 재시도·소진·롤백                                 |

`Suspense Cache Flow`의 전용 계약 테스트는 아직 추가하지 않았습니다. 해당 항목은 [`docs/update-plan.md`](../../../docs/update-plan.md)의 P0-I에서 추적합니다.

## 실행

저장소 루트에서 실행합니다.

```bash
pnpm --filter playground test:contract
pnpm --filter playground test:e2e --workers=2
```

특정 파일만 실행할 때는 Playwright executable을 직접 호출합니다.

```bash
pnpm --filter playground exec playwright test \
  tests/tx-rollback.spec.ts \
  --reporter=line
```

## 측정 결과

측정값을 기록하는 테스트는 `tests/utils/metrics.ts`를 사용하며 저장소 루트의 `.metrics/`에 결과를 생성합니다. `sync-staleness`는 source, package fingerprint, 실행 환경, 측정 시각과 current/last-success 상태를 포함하는 schema v1 artifact를 생성합니다. 기존 benchmark 파일은 schema 전환 전까지 legacy로 분리합니다.

다음 명령은 schema 검증을 통과한 artifact를 immutable run 경로에 게시하고 `public/metrics/manifest.json`을 마지막에 교체합니다. main workflow는 실패한 contract artifact도 게시한 뒤 job 실패를 복원하며, publisher는 이전 manifest의 마지막 성공 run ID를 계승합니다.

```bash
pnpm --filter playground metrics:sync
```

GitHub Pages의 `https://joseph0926.github.io/firsttx/`가 canonical metric host입니다. `/lab`은 `sync-staleness` artifact를 표시하고, source mismatch·24시간 만료·fetch/schema 오류와 미게시 scenario를 성공값으로 대체하지 않습니다. 실제 `main` 배포와 production smoke 확인 전까지 P0-E 전체 상태는 진행 중입니다.
