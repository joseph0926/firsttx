# Playground Playwright Tests

이 디렉터리는 공개 시나리오의 동작 검사와 브라우저 측정값 수집을 함께 소유합니다. 테스트 통과와 성능 보장은 같은 의미가 아닙니다.

- 결정적인 동작은 assertion으로 판정합니다.
- 브라우저 성능값은 `.metrics/*.latest.json`에 관찰 결과로 저장합니다.
- 알려진 한계는 한계가 재현되고 공개 설명과 일치하는지를 검사합니다.

## 현재 테스트

| 파일                               | 범위                                        |
| ---------------------------------- | ------------------------------------------- |
| `home.smoke.spec.ts`               | 홈, 투어 진입, 검증 기준, 모바일 reflow     |
| `prepaint-handoff.spec.ts`         | Prepaint 오버레이와 React 전환 계약         |
| `prepaint-heavy.spec.ts`           | Heavy Page의 cold/warm 브라우저 측정        |
| `prepaint-route-switching.spec.ts` | 경로별 방문·측정·서버 동기화                |
| `instant-cart.metrics.spec.ts`     | 요청 우선 방식과 낙관적 반영의 측정값       |
| `sync-staleness.spec.ts`           | stale/never mount 계약과 schema v1 artifact |
| `metric-artifact.test.ts`          | artifact·manifest·loader 경계               |
| `tx-concurrent.metrics.spec.ts`    | 겹치는 호출의 결과와 공유 상태 측정         |
| `tx-rollback.spec.ts`              | 실패 뒤 역순 보상 처리                      |
| `tx-network-chaos.spec.ts`         | 고정 실패 사례의 재시도·소진·롤백           |

`Replace / Rollback Ordering`과 `Suspense Cache Flow`의 전용 계약 테스트는 아직 추가하지 않았습니다. 두 항목은 [`docs/update-plan.md`](../../../docs/update-plan.md)의 P0-F와 P0-I에서 추적합니다.

## 실행

저장소 루트에서 실행합니다.

```bash
pnpm --filter playground test:contract
pnpm --filter playground test:e2e --workers=2
```

특정 파일만 실행할 때는 파일명을 뒤에 붙입니다.

```bash
pnpm --filter playground test:e2e -- tests/tx-rollback.spec.ts
```

## 측정 결과

측정값을 기록하는 테스트는 `tests/utils/metrics.ts`를 사용하며 저장소 루트의 `.metrics/`에 결과를 생성합니다. `sync-staleness`는 source, package fingerprint, 실행 환경, 측정 시각과 current/last-success 상태를 포함하는 schema v1 artifact를 생성합니다. 기존 benchmark 파일은 schema 전환 전까지 legacy로 분리합니다.

다음 명령은 schema 검증을 통과한 artifact를 immutable run 경로에 게시하고 `public/metrics/manifest.json`을 마지막에 교체합니다. main workflow는 실패한 contract artifact도 게시한 뒤 job 실패를 복원하며, publisher는 이전 manifest의 마지막 성공 run ID를 계승합니다.

```bash
pnpm --filter playground metrics:sync
```

GitHub Pages의 `https://joseph0926.github.io/firsttx/`가 canonical metric host입니다. `/lab`은 `sync-staleness` artifact를 표시하고, source mismatch·24시간 만료·fetch/schema 오류와 미게시 scenario를 성공값으로 대체하지 않습니다. 실제 `main` 배포와 production smoke 확인 전까지 P0-E 전체 상태는 진행 중입니다.
