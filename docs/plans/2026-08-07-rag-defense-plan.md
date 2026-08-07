# FirstTx Docs RAG defense plan

- 상태: 계획 확정, 구현 미시작
- 작성일: 2026-08-07
- 대상: `apps/docs`의 canonical content, indexing, retrieval, Chat 보조 경로와 운영 관찰 surface
- 우선순위: P0 lifecycle defense, P1 운영 편의
- 첫 구현 task: [deterministic index plan SPEC](../spec-packets/2026-08-07-deterministic-index-plan.md)

## 문서 역할

이 문서는 FirstTx Docs RAG를 실패에 안전하고 반복 검증 가능한 운영 경로로 바꾸는 전체 실행 계획이다. 2026-08-06 외부 계획에서 FirstTx가 소유할 engineering 범위만 가져와 현재 source와 대조했다. 채용, 이력서, 면접과 같은 다른 저장소의 관심사는 포함하지 않는다.

각 구현 task는 별도 SPEC packet으로 Goal, Scope, Domain contract, Acceptance와 Verification을 먼저 고정한다. 이 계획은 task 순서와 전체 완료 조건을 소유하며, 개별 task의 최신 구현 계약은 연결된 SPEC packet이 소유한다.

## 문제 정의

현재 RAG는 canonical MDX를 정규화하고 locale별로 chunk와 embedding을 만든 뒤 Upstash Vector의 `ko`, `en` namespace에 저장한다. Chat runtime은 같은 locale namespace를 직접 검색한다.

현재 indexing 명령은 embedding cache를 전체 삭제하고 활성 namespace를 reset한 뒤 upsert한다. reset 이후 embedding 또는 upsert가 실패하면 사용자가 읽는 index가 비거나 부분 상태가 될 수 있다. 또한 어떤 content revision이 활성인지, 마지막 run이 왜 실패했는지, 실제 query가 어떤 문서를 검색했는지, 고정 질문에서 retrieval 품질이 유지되는지를 확인할 durable artifact가 없다.

이 계획의 핵심은 새 chatbot을 만드는 것이 아니라 다음 producer-consumer 경로를 방어하는 것이다.

```text
canonical MDX
  -> normalize + chunk
  -> deterministic content revision
  -> versioned staging namespace
  -> count + metadata + retrieval validation
  -> active pointer 전환
  -> runtime retrieval
  -> prompt context

IndexRun + ActiveIndexPointer
  -> read-only status API
  -> retrieval inspector
  -> fixed-case evaluation
```

## 현재 기준선

| 경로                                   | 현재 책임                               | 기준선                                                            |
| -------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `apps/docs/content/docs/*.{ko,en}.mdx` | 화면과 RAG가 공유하는 canonical content | 9개 document id의 KO/EN pair 18개                                 |
| `apps/docs/scripts/canonical-mdx.ts`   | MDX normalization                       | 화면 전용 metadata와 JSX를 검색 가능한 Markdown으로 변환          |
| `apps/docs/scripts/chunk-md.ts`        | chunking                                | H1/H2/H3 경계, 최소 100자, 최대 2,000자                           |
| `apps/docs/scripts/main.ts`            | indexing orchestration                  | cache 삭제 후 locale별 reset, embedding, upsert                   |
| `apps/docs/scripts/vector.ts`          | vector mutation                         | locale namespace reset, batch upsert, query                       |
| `apps/docs/lib/vector/search.ts`       | runtime retrieval                       | 고정 locale namespace, 기본 topK 5, minScore 0.5                  |
| `apps/docs/lib/ai/rag.ts`              | prompt context                          | 최대 4,000자 context, locale prompt, UNKNOWN 규칙                 |
| `apps/docs/app/api/chat/route.ts`      | Chat HTTP API                           | 입력/locale 검증, rate limit, retrieval, streaming, typed failure |
| `apps/docs/README.md`                  | 운영 경계                               | `ai`가 외부 상태 변경 명령임을 명시                               |

보존할 강점:

- canonical 화면 문서와 RAG 입력은 계속 하나의 source를 사용한다.
- KO/EN index와 retrieval은 locale 경계를 유지한다.
- Chat 실패는 문서 읽기와 탐색을 막지 않는다.
- rate limit, server failure와 network failure의 typed recovery 계약을 보존한다.
- 외부 AI 요청 없이 Chat presentation/error state를 재현할 수 있다.

## 목표

1. 새 index build가 실패해도 기존 활성 index와 사용자 retrieval 결과가 유지된다.
2. 같은 canonical 입력과 index contract는 같은 content revision과 namespace 후보를 만든다.
3. 성공한 run만 validation 뒤 활성화되며 migration 중에는 legacy namespace fallback을 제공한다.
4. 운영자가 locale별 active revision, stale 여부, 최신 run과 실패 원인을 읽기 전용으로 확인한다.
5. 개발자가 LLM 생성 전 retrieval rank, score, source, section과 context truncation을 재현한다.
6. KO/EN 고정 질문으로 Hit@3와 MRR을 반복 측정하고 miss를 숨기지 않는다.
7. 운영 mutation, 관찰 API와 사용자 Chat의 authority를 분리한다.

## 범위

### P0

- deterministic content revision과 versioned namespace plan
- locale별 `IndexRun` manifest와 상태 전이
- staging upsert, validation과 active pointer 전환
- 실패 시 기존 active pointer 보존
- pointer 부재 시 legacy `ko`, `en` fallback
- locale별 status read API
- retrieval inspector read API와 최소 운영 화면
- KO/EN 합계 12개 이상의 고정 retrieval case와 Hit@3/MRR artifact
- state, failure, pointer, API, existing Chat recovery와 ops fixture 검증
- index lifecycle 운영 문서

### P1

- 이전 성공 run으로 명시적 rollback하는 CLI
- 최근 run history
- Chat citation link
- model/version을 포함한 embedding cache key와 선택적 reuse
- retrieval/indexing latency 관찰값
- 수동 namespace retention/cleanup 절차

## 제외

- 외부 사용자 문서 업로드/삭제와 CMS
- 공개 reindex, activate, rollback 또는 namespace delete API
- 신규 로그인, session, RBAC, authorization와 감사 시스템
- vector/embedding provider 교체 또는 다중 provider abstraction
- queue, background worker와 분산 indexing
- agent orchestration과 tool calling
- LLM-as-judge 기반 답변 정확도 자동 판정
- FirstTx package 본체와 Playground 기능 변경
- 사용자 수, 비용 절감, 대규모 트래픽 또는 답변 정확도 claim

## 핵심 결정

### Canonical source

`content/docs/*.{ko,en}.mdx`를 화면과 RAG의 유일한 content source로 유지한다. 별도 corpus나 upload database를 만들지 않는다.

### 실패 안전 index 전환

활성 namespace를 reset하지 않는다. 새 versioned namespace를 staging으로 만들고 source 수, expected/indexed chunk 수, metadata shape와 locale retrieval smoke를 검증한 뒤 active pointer만 전환한다.

다음 invariant는 P0 전체에서 바뀌지 않는다.

- canonical read, chunk, embedding, upsert 또는 validation 실패는 active pointer를 바꾸지 않는다.
- 한 locale의 실패는 다른 locale의 active pointer를 바꾸지 않는다.
- `failed` run은 `active`가 될 수 없다.
- 새 staging namespace는 activation 전 사용자 retrieval에 노출되지 않는다.
- pointer가 없는 migration 상태에서만 legacy `ko`, `en` namespace를 읽는다.
- pointer와 manifest가 불일치하면 임의의 staging namespace를 선택하지 않는다.

### Authority 분리

- CLI: plan, index, evaluate와 P1 rollback
- 웹 API/UI: status와 retrieval observation만 제공
- Chat: active pointer가 선택한 namespace의 retrieval consumer
- 자동 cleanup: P0에서 수행하지 않음

인증 없는 공개 mutation surface는 만들지 않는다.

### 평가 경계

P0는 generation answer accuracy를 자동 판정하지 않는다. 고정 query와 expected source/section을 사용해 retrieval Hit@3와 MRR을 계산한다. prompt는 known context, empty retrieval과 UNKNOWN 규칙을 unit test로 검증하고, Chat recovery E2E는 유지한다.

## 목표 도메인 모델

### `IndexRun`

```ts
type IndexRunState = 'prepared' | 'indexing' | 'validating' | 'active' | 'failed';

interface IndexRun {
  id: string;
  locale: 'ko' | 'en';
  state: IndexRunState;
  namespace: string;
  contentRevision: string;
  indexContractVersion: string;
  embeddingModel: string;
  startedAt: string;
  finishedAt?: string;
  sourceCount: number;
  expectedChunkCount: number;
  indexedChunkCount: number;
  previousActiveRunId?: string;
  failureCause?:
    'embedding_failed' | 'vector_upsert_failed' | 'validation_failed' | 'activation_failed';
}
```

### `ActiveIndexPointer`

```ts
interface ActiveIndexPointer {
  locale: 'ko' | 'en';
  runId: string;
  namespace: string;
  contentRevision: string;
  activatedAt: string;
}
```

### `RetrievalEvaluationCase`

```ts
interface RetrievalEvaluationCase {
  id: string;
  locale: 'ko' | 'en';
  query: string;
  expectedSources: string[];
  expectedSections?: string[];
}
```

최종 필드, validation과 저장 형식은 해당 task SPEC에서 확정한다. 공개 API에는 provider payload, token, credential, 내부 URL과 raw embedding을 포함하지 않는다.

## HTTP와 CLI 목표 계약

### Read-only HTTP

- `GET /api/rag/status?locale=ko`
  - `ready | stale | uninitialized | degraded`
  - active revision, source/chunk 수, activation 시각과 latest run summary
- `POST /api/rag/retrievals`
  - 생성 모델을 호출하지 않는 retrieval query
  - trim 후 query 1~~500자, locale allowlist, topK 1~~8
  - runId, rank, score, title, section, canonical href, contextChars, truncated
  - rate limit과 제한된 public preview

`POST /api/rag/reindex`, `POST /api/rag/activate`, `POST /api/rag/rollback`, `DELETE /api/rag/namespaces/*`는 P0에서 금지한다.

### CLI

```text
pnpm --filter @firsttx/docs ai:plan
pnpm --filter @firsttx/docs ai:index
pnpm --filter @firsttx/docs ai:evaluate
pnpm --filter @firsttx/docs ai:rollback -- --locale ko --run <runId>
```

- `ai:plan`: read-only source/chunk/revision/namespace plan
- `ai:index`: staging build, validation, active pointer 전환
- `ai:evaluate`: 현재 active index에 고정 retrieval case 실행
- `ai:rollback`: P1, 이전 성공 run 재활성화
- 기존 `ai`: P0 전환 완료 뒤 `ai:index` alias로 보존

## 작업 순서

| Task | 목표                          | 주요 산출물                                                      | 선행 조건                                                                     | 완료 gate                                         |
| ---- | ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| T1   | deterministic index plan      | pure revision/plan contract, `ai:plan`, unit test, README        | [T1 SPEC](../spec-packets/2026-08-07-deterministic-index-plan.md) 사용자 확정 | T1 AC 전체                                        |
| T2   | versioned run manifest        | `IndexRun` repository, 상태 전이, staging write                  | pointer 저장소와 retention 결정                                               | 실패 run이 stable cause를 남기고 active 불변      |
| T3   | validation과 activation       | count/metadata/smoke validation, active pointer, legacy fallback | provider postcondition 확정                                                   | 성공 run만 active, failure 후 기존 retrieval 유지 |
| T4   | runtime resolution과 status   | active resolver, status API, stale/degraded projection           | T3                                                                            | runtime과 status가 같은 pointer 계약 사용         |
| T5   | retrieval inspection과 평가   | retrieval API, KO/EN case, Hit@3/MRR runner                      | canonical href와 artifact 위치 결정                                           | 재현 가능한 metric/miss artifact                  |
| T6   | 최소 ops UI와 failure defense | `/{locale}/ops/rag`, fixture, contract/E2E/build 검증            | T4, T5                                                                        | ops failure가 Docs/Chat을 막지 않음               |
| T7   | 운영 마감                     | README, operations guide, P1 rollback/cleanup 판단               | P0 evidence                                                                   | 명령, 권한, 실패, metric과 한계가 일치            |

### T1 — deterministic index plan

외부 credential과 provider 요청 없이 canonical MDX에서 locale별 content revision, versioned namespace 후보, source 수와 expected chunk 수를 산출한다. 기존 `ai` mutation 경로는 변경하지 않는다. 세부 계약과 질문은 연결된 SPEC packet이 소유한다.

### T2 — versioned run manifest

`prepared -> indexing -> validating -> active`와 진행 상태의 `failed` 전이를 구현한다. manifest 저장소, key schema, run retention과 failure sanitization을 이 task의 SPEC에서 먼저 확정한다.

### T3 — validation과 activation

expected/indexed chunk 수뿐 아니라 metadata shape와 locale retrieval smoke를 통과한 run만 active pointer로 전환한다. activation 실패 뒤 pointer를 다시 읽어 확인된 기존 active만 사용한다.

### T4 — runtime resolution과 status

runtime search를 active pointer resolver에 연결하고 migration 중 pointer가 없을 때만 legacy namespace로 fallback한다. current build revision과 active revision을 비교해 status를 projection한다.

### T5 — retrieval inspection과 평가

LLM generation을 호출하지 않는 retrieval API와 고정 case runner를 만든다. initial universe는 KO 6건, EN 6건이며 Prepaint, Local-First, Tx의 증상/계약 질문을 포함한다.

### T6 — 최소 ops UI와 failure defense

화려한 dashboard가 아니라 active summary, latest run, retrieval table, evaluation summary와 mutation boundary만 제공한다. loading, stale, uninitialized, degraded, retrieval-empty/error fixture를 외부 provider 없이 재현한다.

### T7 — 운영 마감

운영 문서가 실제 명령, 실패 처리, 외부 상태 변경 승인과 검증 artifact를 연결한다. P1은 P0 evidence가 모두 닫힌 뒤에만 선택한다.

## 파일 소유 예상

실제 task 시작 전에 같은 책임의 기존 파일과 naming을 다시 대조해 신규 파일 수를 줄인다.

| 경로                                        | 예상 책임                                                     |
| ------------------------------------------- | ------------------------------------------------------------- |
| `apps/docs/package.json`                    | `ai:plan`, `ai:index`, `ai:evaluate`, 조건부 rollback scripts |
| `apps/docs/scripts/main.ts`                 | reset-first orchestration을 lifecycle 단계로 교체             |
| `apps/docs/scripts/vector.ts`               | versioned namespace mutation과 validation primitive           |
| `apps/docs/lib/ai/index-contract.ts`        | plan, run, pointer와 evaluation의 공유 계약                   |
| `apps/docs/lib/ai/index-run.ts`             | manifest 저장/조회와 상태 전이                                |
| `apps/docs/lib/vector/active-index.ts`      | pointer resolve, activate와 legacy fallback                   |
| `apps/docs/lib/vector/search.ts`            | active namespace와 search metadata 적용                       |
| `apps/docs/app/api/rag/status/route.ts`     | status read API                                               |
| `apps/docs/app/api/rag/retrievals/route.ts` | rate-limited retrieval read API                               |
| `apps/docs/app/[locale]/ops/rag/page.tsx`   | 최소 ops page                                                 |
| `apps/docs/components/rag-ops/*`            | status, inspector와 evaluation UI                             |
| `apps/docs/evaluations/*`                   | KO/EN case와 결과 schema                                      |
| `apps/docs/scripts/evaluate-retrieval.ts`   | Hit@3와 MRR runner                                            |
| `apps/docs/README.md`                       | 명령과 mutation boundary                                      |
| `docs/operations/rag-index-operations.md`   | lifecycle, failure와 운영 절차                                |

## 전체 Acceptance Criteria

- AC1: canonical MDX에서 prompt context까지 producer-consumer 경로가 코드와 문서에서 추적된다.
- AC2: 같은 canonical 입력과 index contract가 같은 locale별 revision과 namespace plan을 만든다.
- AC3: index build는 active namespace를 먼저 reset하지 않는다.
- AC4: embedding, upsert 또는 validation 실패 뒤 active pointer와 사용자 retrieval 결과가 유지된다.
- AC5: 성공한 run만 active pointer로 전환된다.
- AC6: runtime search는 active pointer를 사용하고 migration 중 legacy fallback을 제공한다.
- AC7: status API는 ready, stale, uninitialized, degraded를 구분하고 secret/provider payload를 노출하지 않는다.
- AC8: retrieval API는 query, locale, topK를 검증하고 rate limit과 public source metadata를 제공한다.
- AC9: ops 화면은 active/latest run, retrieval 결과와 평가 요약을 표시하며 Docs/Chat과 독립적으로 실패한다.
- AC10: KO/EN 합계 12개 이상의 고정 case에 Hit@3와 MRR artifact가 존재한다.
- AC11: Hit@3가 0.80 미만이면 miss와 보류 결정을 결과에 남긴다.
- AC12: state, pointer, API, existing Chat recovery, ops fixture test와 docs typecheck/lint/build가 통과한다.
- AC13: 공개 mutation endpoint와 신규 auth/RBAC를 추가하지 않는다.
- AC14: README와 operations guide가 기존 위험, 권한 경계, 명령, 결과와 남은 한계를 설명한다.

## Verification strategy

### 외부 상태를 바꾸지 않는 검증

```bash
asdf current nodejs
command -v node
command -v pnpm
corepack --version
pnpm --pm-on-fail=error --version
pnpm --filter @firsttx/docs typecheck
pnpm --filter @firsttx/docs lint
pnpm --filter @firsttx/docs test:run
pnpm --filter @firsttx/docs build
pnpm --filter @firsttx/docs test:e2e
pnpm --filter @firsttx/docs ai:plan
```

### 외부 상태를 읽거나 바꾸는 검증

provider credential을 사용하는 query/evaluation과 Redis/Vector mutation은 별도 승인을 받은 뒤 실행한다.

```bash
pnpm --filter @firsttx/docs ai:index
pnpm --filter @firsttx/docs ai:evaluate
```

실행 전후 active pointer, 새 run manifest, 기존 namespace 보존, Chat smoke, status/ops와 evaluation artifact를 함께 기록한다. `ai:index` 실패 뒤 active pointer가 유지되지 않으면 P0 전체는 실패다.

## Open decision gates

| Gate                                                 | 닫아야 하는 시점 | 기본 방향                                                        | 미확정 영향                             |
| ---------------------------------------------------- | ---------------- | ---------------------------------------------------------------- | --------------------------------------- |
| Upstash activation postcondition과 pointer atomicity | T2 시작 전       | Redis pointer를 단일 locale key로 관리하고 전환 후 재조회        | manifest/pointer 저장 계약              |
| current build revision의 runtime 제공 방식           | T4 시작 전       | build artifact를 읽음                                            | stale projection과 deploy contract      |
| canonical href helper                                | T5 시작 전       | 기존 locale route/anchor owner 재사용                            | retrieval response 계약                 |
| evaluation result 위치                               | T5 시작 전       | case는 repo, raw result는 timestamped artifact, 문서는 최신 요약 | diff 크기와 CI artifact 보존            |
| ops route production 노출                            | T6 시작 전       | feature flag, read-only, public metadata만 제공                  | route discoverability와 security review |
| legacy namespace retention                           | T7 시작 전       | 자동 cleanup 없음                                                | storage cost와 rollback window          |

## 위험과 범위 축소 순서

| 위험                                   | 대응                                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| reset-first 경로와 새 경로가 함께 남음 | 기존 `ai` alias 전환 시점과 제거 gate를 T3에 고정            |
| provider capability를 추측             | T2 전에 공식 SDK/실환경 read-only probe로 postcondition 확인 |
| 평가 case를 현재 결과에 과적합         | 사용자 증상/계약 질문과 expected source를 실행 전에 고정     |
| ops UI가 auth 작업으로 확장            | mutation 금지, 공개 metadata 제한, feature flag 유지         |
| 기존 Chat recovery 회귀                | Chat route contract와 기존 unit/E2E를 필수 gate로 유지       |
| 여러 task가 한 diff에 섞임             | task별 SPEC, ownership과 acceptance 단위로 구현/검증         |

일정이 밀리면 최근 run history, rollback CLI, Chat citation, latency, embedding cache 개선 순서로 제외한다. 다음은 끝까지 유지한다.

1. failed index가 active를 바꾸지 않는 invariant
2. active revision/status 조회
3. retrieval inspector
4. 고정 질문 평가와 miss artifact
5. 운영 문서와 회귀 테스트

## 현재 진행 상태

- [x] 전체 engineering plan을 FirstTx 저장소에 정규화
- [x] 첫 구현 task의 SPEC packet 작성
- [ ] T1 packet의 미정 질문 사용자 확정
- [ ] T1 구현 시작 신호
- [ ] T1~T7 구현과 검증

이 문서 작성 시점에는 production/test code, package script와 외부 provider 상태를 변경하지 않았다.
