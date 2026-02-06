# 보안 운영 인덱스 (내부 엔지니어용)

> 마지막 업데이트: 2026-02-06
> 독자: FirstTx 내부 엔지니어
> 기준 범위: `/Users/kimyounghoon/Downloads/@kyh/@firsttx/firsttx` 모노레포

## 역할 구분

- 외부 공개 보안 정책: `/Users/kimyounghoon/Downloads/@kyh/@firsttx/firsttx/SECURITY.md`
- 내부 운영 이슈/추적: `/Users/kimyounghoon/Downloads/@kyh/@firsttx/firsttx/docs/security/*`
- 이름 충돌 주의: `SECURITY.md`는 외부 정책, `docs/security/security.md`는 내부 이슈 레지스터입니다.

## 문서 맵

| 문서                                       | 역할                              | 관리 단위                  |
| ------------------------------------------ | --------------------------------- | -------------------------- |
| [`README.md`](./README.md)                 | 단일 운영 인덱스 (SOT)            | 전체 이슈/상태/재검증 절차 |
| [`summary.md`](./summary.md)               | 라운드 의사결정/마일스톤          | 실행 순서/스프린트 계획    |
| [`security.md`](./security.md)             | Security 영역 이슈 레지스터       | `SEC-*`                    |
| [`data-integrity.md`](./data-integrity.md) | Data Integrity 영역 이슈 레지스터 | `DATA-*`                   |
| [`performance.md`](./performance.md)       | Performance 영역 이슈 레지스터    | `PERF-*`                   |
| [`test-coverage.md`](./test-coverage.md)   | Test Coverage 영역 이슈 레지스터  | `TC-*`                     |

## 표준 이슈 스키마 (12 필드)

모든 이슈는 아래 필드를 동일하게 포함해야 합니다.

1. `ID`
2. `Severity`
3. `Status`
4. `Owner`
5. `Component`
6. `Location`
7. `Impact`
8. `Repro`
9. `Fix Plan`
10. `Validation`
11. `Last Verified`
12. `Related PR/Issue`

## 운영 대시보드

### 심각도 집계

| 영역                      | Critical |   High | Medium |   Low |   합계 |
| ------------------------- | -------: | -----: | -----: | ----: | -----: |
| Security (`SEC-*`)        |        0 |      0 |      3 |     4 |      7 |
| Data Integrity (`DATA-*`) |        1 |      3 |      2 |     1 |      7 |
| Performance (`PERF-*`)    |        1 |      3 |      5 |     2 |     11 |
| Test Coverage (`TC-*`)    |        4 |      4 |      4 |     0 |     12 |
| **합계**                  |    **6** | **10** | **14** | **7** | **37** |

### 상태 집계

| Status  | 건수 |
| ------- | ---: |
| Open    |   11 |
| Planned |   22 |
| Done    |    4 |

## 단일 이슈 인덱스 (SOT)

| ID      | Severity | Status  | Owner      | Last Verified | Component       | 상세                                     |
| ------- | -------- | ------- | ---------- | ------------- | --------------- | ---------------------------------------- |
| SEC-01  | Medium   | Open    | Unassigned | 2026-02-06    | prepaint/shared | [`SEC-01`](./security.md#sec-01)         |
| SEC-02  | Medium   | Done    | Unassigned | 2026-02-06    | prepaint        | [`SEC-02`](./security.md#sec-02)         |
| SEC-03  | Medium   | Open    | Unassigned | 2026-02-06    | shared          | [`SEC-03`](./security.md#sec-03)         |
| SEC-04  | Low      | Planned | Unassigned | 2026-02-06    | prepaint        | [`SEC-04`](./security.md#sec-04)         |
| SEC-05  | Low      | Planned | Unassigned | 2026-02-06    | prepaint/shared | [`SEC-05`](./security.md#sec-05)         |
| SEC-06  | Low      | Planned | Unassigned | 2026-02-06    | prepaint        | [`SEC-06`](./security.md#sec-06)         |
| SEC-07  | Low      | Planned | Unassigned | 2026-02-06    | prepaint        | [`SEC-07`](./security.md#sec-07)         |
| DATA-01 | Critical | Done    | Unassigned | 2026-02-06    | local-first     | [`DATA-01`](./data-integrity.md#data-01) |
| DATA-02 | High     | Open    | Unassigned | 2026-02-06    | local-first     | [`DATA-02`](./data-integrity.md#data-02) |
| DATA-03 | High     | Open    | Unassigned | 2026-02-06    | local-first     | [`DATA-03`](./data-integrity.md#data-03) |
| DATA-04 | High     | Open    | Unassigned | 2026-02-06    | tx              | [`DATA-04`](./data-integrity.md#data-04) |
| DATA-05 | Medium   | Planned | Unassigned | 2026-02-06    | local-first     | [`DATA-05`](./data-integrity.md#data-05) |
| DATA-06 | Medium   | Planned | Unassigned | 2026-02-06    | local-first     | [`DATA-06`](./data-integrity.md#data-06) |
| DATA-07 | Low      | Planned | Unassigned | 2026-02-06    | local-first     | [`DATA-07`](./data-integrity.md#data-07) |
| PERF-01 | Critical | Done    | Unassigned | 2026-02-06    | prepaint        | [`PERF-01`](./performance.md#perf-01)    |
| PERF-02 | High     | Done    | Unassigned | 2026-02-06    | prepaint        | [`PERF-02`](./performance.md#perf-02)    |
| PERF-03 | High     | Open    | Unassigned | 2026-02-06    | prepaint        | [`PERF-03`](./performance.md#perf-03)    |
| PERF-04 | High     | Open    | Unassigned | 2026-02-06    | devtools        | [`PERF-04`](./performance.md#perf-04)    |
| PERF-05 | Medium   | Planned | Unassigned | 2026-02-06    | devtools        | [`PERF-05`](./performance.md#perf-05)    |
| PERF-06 | Medium   | Planned | Unassigned | 2026-02-06    | devtools        | [`PERF-06`](./performance.md#perf-06)    |
| PERF-07 | Medium   | Planned | Unassigned | 2026-02-06    | devtools        | [`PERF-07`](./performance.md#perf-07)    |
| PERF-08 | Medium   | Planned | Unassigned | 2026-02-06    | prepaint        | [`PERF-08`](./performance.md#perf-08)    |
| PERF-09 | Medium   | Planned | Unassigned | 2026-02-06    | devtools        | [`PERF-09`](./performance.md#perf-09)    |
| PERF-10 | Low      | Planned | Unassigned | 2026-02-06    | shared          | [`PERF-10`](./performance.md#perf-10)    |
| PERF-11 | Low      | Planned | Unassigned | 2026-02-06    | prepaint        | [`PERF-11`](./performance.md#perf-11)    |
| TC-01   | Critical | Open    | Unassigned | 2026-02-06    | local-first     | [`TC-01`](./test-coverage.md#tc-01)      |
| TC-02   | Critical | Open    | Unassigned | 2026-02-06    | local-first     | [`TC-02`](./test-coverage.md#tc-02)      |
| TC-03   | Critical | Open    | Unassigned | 2026-02-06    | local-first     | [`TC-03`](./test-coverage.md#tc-03)      |
| TC-04   | Critical | Open    | Unassigned | 2026-02-06    | devtools        | [`TC-04`](./test-coverage.md#tc-04)      |
| TC-05   | High     | Planned | Unassigned | 2026-02-06    | local-first     | [`TC-05`](./test-coverage.md#tc-05)      |
| TC-06   | High     | Planned | Unassigned | 2026-02-06    | devtools        | [`TC-06`](./test-coverage.md#tc-06)      |
| TC-07   | High     | Planned | Unassigned | 2026-02-06    | prepaint        | [`TC-07`](./test-coverage.md#tc-07)      |
| TC-08   | High     | Planned | Unassigned | 2026-02-06    | local-first/tx  | [`TC-08`](./test-coverage.md#tc-08)      |
| TC-09   | Medium   | Planned | Unassigned | 2026-02-06    | prepaint        | [`TC-09`](./test-coverage.md#tc-09)      |
| TC-10   | Medium   | Planned | Unassigned | 2026-02-06    | prepaint        | [`TC-10`](./test-coverage.md#tc-10)      |
| TC-11   | Medium   | Planned | Unassigned | 2026-02-06    | tx              | [`TC-11`](./test-coverage.md#tc-11)      |
| TC-12   | Medium   | Planned | Unassigned | 2026-02-06    | playground      | [`TC-12`](./test-coverage.md#tc-12)      |

## 샘플 추적 경로 (인덱스 -> 상세 -> 코드)

- `SEC-02` -> [`security.md#sec-02`](./security.md#sec-02) -> `packages/prepaint/src/plugin/vite.ts:71-93`
- `DATA-01` -> [`data-integrity.md#data-01`](./data-integrity.md#data-01) -> `packages/local-first/src/sync-manager.ts:96-142`
- `PERF-04` -> [`performance.md#perf-04`](./performance.md#perf-04) -> `packages/devtools/src/bridge/index.ts:29-31`

## 재검증 절차 (Phase A -> D)

### Phase A. 구조 점검

1. 모든 문서에 표준 12필드가 존재하는지 확인합니다.
2. `README` 집계와 영역 문서 이슈 수가 일치하는지 확인합니다.
3. `summary.md`가 의사결정/마일스톤만 유지하는지 확인합니다.

### Phase B. 근거 Spot-check

1. `Critical` 이슈 전수 점검을 수행합니다.
2. `High/Medium/Low`에서 각각 최소 1건씩 코드 라인 참조 유효성을 점검합니다.
3. 필요 시 심각도/영향도를 재평가합니다.

### Phase C. 상태 갱신

1. `Status`, `Owner`, `Last Verified`를 최신화합니다.
2. `Status=Done`인 이슈는 `Related PR/Issue` 링크를 필수로 입력합니다.
3. 완료된 이슈는 요약 문서 마일스톤과 동기화합니다.

### Phase D. 검증 명령 실행

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm --filter @firsttx/docs build
pnpm run format:check
```

라인 참조 추출/검증용 명령:

```bash
rg -o 'packages/[^`]+:[0-9]+(-[0-9]+)?' docs/security/*.md \
  | awk -F: '{print $2":"$3}' \
  | sort -u
```

## 운영 규칙

- 단일 진실원은 이 문서(`README.md`)입니다.
- 상세 내용 수정 시 반드시 인덱스 표(`Status`, `Last Verified`)를 함께 갱신합니다.
- 심각도 변경 시 변경 이유를 `summary.md`의 의사결정 로그에 기록합니다.
