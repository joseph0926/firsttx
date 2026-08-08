# T1 — deterministic index plan

- 상태: 구현 완료, native 검증 통과
- 현재 작업 분류: M-C (구현과 검증)
- 최초 작업 분류: L-A (계획과 SPEC 문서화)
- packet mode: interactive
- 작성일: 2026-08-07
- 상위 계획: [FirstTx Docs RAG defense plan](../plans/2026-08-07-rag-defense-plan.md)

## 사용자 확정 신호

2026-08-07 사용자 요청은 전체 계획과 첫 task의 `spec-gated-coding` 문서화까지만 허용한다. production/test code, package script, 외부 provider와 Git 상태 변경은 승인 범위가 아니다. 후속 구현은 사용자가 이 packet의 미정 질문에 답하고 `구현 시작`, `이대로 진행`과 같은 별도 신호를 준 뒤 시작한다.

## 내가 이해한 요청

RAG lifecycle 전체를 한 번에 구현하기 전에, 외부 상태를 전혀 건드리지 않고 현재 canonical MDX가 어떤 index를 만들 예정인지 결정적으로 설명하는 첫 구현 단위를 고정한다.

T1은 locale별 canonical source를 읽고 content revision, versioned namespace 후보, source 수와 expected chunk 수를 JSON으로 산출하는 `ai:plan`을 추가한다. 현재 reset-first `ai` 명령, runtime search와 Chat 동작은 바꾸지 않는다.

## 현재 확정된 것

- `apps/docs/content/docs/*.{ko,en}.mdx`가 화면과 RAG 입력의 유일한 canonical content source다.
- `readCanonicalMdxDocuments`가 MDX를 정규화하고 source 이름으로 정렬한다.
- `chunkMarkdown`가 실제 indexing의 chunk 계약을 소유한다.
- 실제 indexing과 runtime query embedding은 현재 `text-embedding-3-small`을 사용한다.
- content revision은 normalized content, locale, chunk/index contract version과 embedding model identifier를 안정적으로 직렬화한 SHA-256이다.
- namespace 후보는 `rag-{locale}-{contentRevision 앞 12자}`다.
- `ai:plan`은 credential, `.env*`, Redis, Vector와 embedding provider를 읽거나 호출하지 않는다.
- 기존 `ai` 명령의 이름과 reset-first 실행 순서는 T1에서 유지한다.
- 새 dependency를 추가하지 않는다.

## 해소된 질문

두 질문 모두 2026-08-08 사용자가 권장안으로 확정했다.

1. 해당 locale의 canonical 문서가 0개일 때 `ai:plan` 동작 → **non-zero exit로 실패**. 빈 staging namespace를 정상 plan으로 취급하지 않아 이후 activation 경계와 일치시킨다. `createIndexPlan`이 stable message로 throw하고 CLI가 stderr + exit 1로 변환한다.
2. T1의 CLI surface → **KO/EN 항상 함께 출력**. 인자를 받지 않으며 `--locale` 선택은 실제 index task에서 다시 판단한다.

## 확정 가정

- 빈 locale 입력은 stable error message와 non-zero exit로 거절한다.
- `ai:plan`은 인자를 받지 않고 KO, EN 순서의 JSON array 하나를 stdout에 출력한다.
- 사람이 읽는 진행 로그는 출력하지 않는다. JSON consumer가 파싱할 수 있는 stdout 계약을 유지한다.
- content revision은 chunk 결과 전체를 중복 직렬화하지 않고 normalized document 입력과 명시적 contract version을 hash한다. chunk algorithm 의미가 바뀌면 contract version을 올린다.

## 목표

1. 같은 의미의 canonical 입력은 파일 열거 순서와 무관하게 같은 locale별 plan을 만든다.
2. content, locale, index contract version 또는 embedding model identifier가 바뀌면 revision도 바뀐다.
3. plan의 source/chunk 수가 실제 canonical reader와 chunker 결과에 일치한다.
4. credential이 없는 로컬/CI 환경에서 외부 side effect 없이 plan을 확인한다.
5. 이후 `IndexRun`과 staging indexer가 공유할 최소 revision/namespace 계약을 제공한다.

## 범위

- embedding model identifier의 단일 상수 owner
- index contract version 상수
- locale별 canonical document selection과 안정 정렬
- SHA-256 content revision 계산
- versioned namespace 후보 생성
- source count와 expected chunk count 계산
- 순수 `IndexPlan` 생성 함수
- KO/EN JSON을 출력하는 `ai:plan` package script
- 결정성, revision sensitivity, count와 no-credential 실행 test
- `apps/docs/README.md`에 read-only/mutation 명령 경계 추가

## 제외

- embedding 생성과 vector upsert
- `IndexRun` 저장소와 상태 전이
- active pointer 생성/전환/rollback
- 현재 `ai` 명령의 alias 또는 동작 변경
- runtime search namespace 변경
- status/retrieval API와 ops UI
- evaluation case와 Hit@3/MRR runner
- embedding cache key 변경
- provider credential 검증
- `.env*` 파일 접근

## 도메인 계약

### `IndexPlan`

```ts
interface IndexPlan {
  locale: 'ko' | 'en';
  contentRevision: string;
  namespace: string;
  sourceCount: number;
  expectedChunkCount: number;
  indexContractVersion: string;
  embeddingModel: string;
}
```

### Revision input

revision 입력은 아래 필드를 이 순서로 가진 JSON object다.

```ts
interface IndexRevisionInput {
  locale: 'ko' | 'en';
  indexContractVersion: string;
  embeddingModel: string;
  documents: Array<{
    docId: string;
    source: string;
    content: string;
  }>;
}
```

규칙:

1. 입력 documents에서 plan locale과 같은 문서만 선택한다.
2. 선택한 문서를 `source` 오름차순으로 정렬한다.
3. `content`는 `normalizeCanonicalMdx` 결과를 그대로 사용한다.
4. 위 object를 `JSON.stringify`한 UTF-8 byte의 SHA-256 lowercase hex를 `contentRevision`으로 사용한다.
5. revision은 64자이며 namespace에는 앞 12자만 사용한다.
6. source 이름이나 content가 바뀌면 revision도 바뀐다.
7. chunk 수는 선택한 각 문서에 현재 `chunkMarkdown`을 적용한 결과의 합이다.

### Contract ownership

- `INDEX_CONTRACT_VERSION`은 revision serialization, normalization 또는 chunk 의미가 바뀔 때 명시적으로 갱신한다.
- `EMBEDDING_MODEL_ID`는 indexing과 runtime query embedding이 함께 참조할 단일 상수다.
- plan 함수는 provider client, environment loader, cache와 vector module을 import하지 않는다.
- `IndexPlan`은 계획 정보이며 activation 권한을 갖지 않는다. count 0을 허용하더라도 후속 validation의 활성화 허가로 해석하지 않는다.

## CLI 계약

명령:

```bash
pnpm --filter @firsttx/docs ai:plan
```

성공 stdout:

```json
[
  {
    "locale": "ko",
    "contentRevision": "<64 lowercase hex>",
    "namespace": "rag-ko-<revision12>",
    "sourceCount": 9,
    "expectedChunkCount": 0,
    "indexContractVersion": "rag-index-v1",
    "embeddingModel": "text-embedding-3-small"
  },
  {
    "locale": "en",
    "contentRevision": "<64 lowercase hex>",
    "namespace": "rag-en-<revision12>",
    "sourceCount": 9,
    "expectedChunkCount": 0,
    "indexContractVersion": "rag-index-v1",
    "embeddingModel": "text-embedding-3-small"
  }
]
```

예시의 `expectedChunkCount`는 schema 자리표시자이며 실제 값은 current chunker 결과를 출력한다. 성공 시 stdout에는 JSON 이외의 로그를 섞지 않는다. 실패 시 원인은 stderr로 보내고 non-zero exit를 반환한다.

## 확정 결정

- source reader와 chunker를 복제하지 않고 현재 구현을 재사용한다.
- locale별 revision을 계산한다.
- namespace에는 full revision이 아니라 앞 12자를 사용하고 full revision은 plan에 보존한다.
- timestamp, run ID, 현재 Git revision과 provider state는 content revision에 포함하지 않는다.
- planner는 synchronous canonical reader/chunker 경계에 맞춰 순수 synchronous 함수로 시작한다.
- `ai:plan` 자체는 `.env*` loader를 import하지 않는다.
- 기존 `ai` 명령은 T1에서 건드리지 않는다.

## 검토한 대안

| 대안                                         | 판정 | 이유                                                                               |
| -------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| timestamp 기반 namespace                     | 거절 | 같은 content의 재현성과 idempotent plan을 잃는다.                                  |
| chunk payload 전체를 revision에 포함         | 거절 | normalized source와 contract version이 이미 의미를 소유하며 payload 중복이 커진다. |
| provider에서 현재 namespace를 읽어 plan 생성 | 거절 | read-only local command가 credential과 외부 가용성에 의존한다.                     |
| 기존 `ai`에 `--dry-run` 추가                 | 거절 | environment/provider import graph와 mutation orchestration에 결합된다.             |
| model ID literal을 planner에 복제            | 거절 | indexing/query model과 revision model이 조용히 drift할 수 있다.                    |

## 제약

- Node.js 24와 repository `packageManager`의 pnpm 11.17.0을 사용한다.
- 새 dependency를 설치하지 않는다. SHA-256은 `node:crypto`를 사용한다.
- `.env`, `.env.local`, `.env.*`를 읽거나 수정하지 않는다.
- package/test 명령은 `apps/docs` ownership boundary로 제한한다.
- source code에 주석을 추가하지 않는다.
- 기존 dirty work가 생기면 unrelated 변경을 보존하고 scope를 다시 분류한다.

## 금지 리팩터

- `canonical-mdx.ts` normalization 의미 변경
- `chunk-md.ts` chunk boundary/size 변경
- `main.ts` reset/upsert 순서 변경
- Redis, Vector와 OpenAI client 구조 변경
- Chat route, prompt, streaming과 UI 변경
- route/locale navigation과 Playground 변경
- 관련 없는 package script 정리

## Acceptance Criteria

- AC-T1: `createIndexPlan(documents, locale)`와 동등한 순수 계약이 `IndexPlan`을 반환한다.
- AC-T2: 같은 문서 집합의 입력 순서가 바뀌어도 plan 전체가 동일하다.
- AC-T3: `contentRevision`은 64자 lowercase SHA-256이다.
- AC-T4: content, locale, index contract version, embedding model 중 하나가 바뀌면 revision이 바뀐다.
- AC-T5: namespace는 `rag-{locale}-{revision 앞 12자}`다.
- AC-T6: sourceCount와 expectedChunkCount가 해당 locale의 실제 reader/chunker 결과와 일치한다.
- AC-T7: 실제 indexing과 runtime query embedding이 plan과 같은 model identifier를 사용한다.
- AC-T8: credential을 제거한 환경에서 `ai:plan`이 KO/EN JSON을 출력하고 network/provider state를 변경하지 않는다.
- AC-T9: 기존 `ai` package script와 reset-first orchestration diff가 없다.
- AC-T10: README가 `ai:plan` read-only와 기존 `ai` mutation 경계를 구분한다.
- AC-T11: 관련 unit test, docs typecheck, lint와 전체 unit test가 통과한다.
- AC-T12: 해당 locale의 canonical 문서가 0개이면 stable message를 stderr로 보내고 non-zero exit로 종료한다.
- AC-T13: `ai:plan`은 인자를 받지 않고 KO, EN 순서의 JSON array 하나만 출력한다.

## Edge cases

- documents 입력 순서가 뒤집힌다.
- KO/EN 문서가 같은 배열에 섞여 있다.
- source가 같고 content만 바뀐다.
- content가 같고 source만 바뀐다.
- model 또는 contract version만 바뀐다.
- 해당 locale 문서가 0개다.
- canonical reader가 파일을 읽지 못한다.
- stdout을 JSON parser가 직접 소비한다.

## 구현 Task breakdown

| 순서 | 작업                                                      | 소유 예상                                     | 완료 조건                                         |
| ---- | --------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| 1    | model/index contract 상수와 `IndexPlan` type 배치         | `apps/docs/lib/ai` 또는 가까운 기존 owner     | model literal duplication 제거, import cycle 없음 |
| 2    | locale selection, stable serialization, hash와 count 함수 | `apps/docs/scripts` 또는 공유 contract owner  | AC-T1~T7 unit test                                |
| 3    | read-only CLI entry와 package script                      | `apps/docs/scripts`, `apps/docs/package.json` | AC-T8~T9                                          |
| 4    | README 명령 경계                                          | `apps/docs/README.md`                         | AC-T10                                            |
| 5    | native verification과 evidence 기록                       | 이 packet Closure                             | AC-T11과 verification claim coverage              |

실제 naming과 file placement는 구현 시작 시 가까운 import convention을 다시 확인해 좁힐 수 있다. Domain contract와 Acceptance가 같으면 implementation change로 기록하고, authority나 CLI behavior가 바뀌면 먼저 이 packet을 reconcile한다.

## Verification map

| Claim                                                        | Type              | 연결 AC    | Planned evidence                                               | Safety        | 현재 coverage |
| ------------------------------------------------------------ | ----------------- | ---------- | -------------------------------------------------------------- | ------------- | ------------- |
| C1 revision/namespace가 결정적이고 입력 변화에 민감함        | executable        | AC-T1~T5   | pure unit test                                                 | safe-no-write | covered       |
| C2 source/chunk 수와 model contract가 실제 producer와 일치함 | executable/static | AC-T6~T7   | canonical fixture unit test, call-site diff review             | safe-no-write | covered       |
| C3 `ai:plan`이 JSON-only이고 외부 side effect가 없음         | executable        | AC-T8~T9   | credential-unset CLI, import graph와 existing `ai` diff review | safe-no-write | covered       |
| C4 문서와 native checks가 T1 경계를 보존함                   | static/executable | AC-T10~T11 | README inspection, docs typecheck/lint/full unit test          | safe-no-write | covered       |
| C5 빈 locale과 CLI surface가 확정 계약대로 동작함            | executable        | AC-T12~T13 | throw unit test, 인자 없는 CLI 실행                            | safe-no-write | covered       |

## 계획 검증 명령

구현 뒤에만 실행한다.

```bash
if command -v asdf >/dev/null 2>&1; then asdf current nodejs; else node --version; fi
command -v node
command -v pnpm
[ "pnpm@$(pnpm --version)" = "$(node -p "require('./package.json').packageManager")" ]
pnpm --filter @firsttx/docs test:run
pnpm --filter @firsttx/docs typecheck
pnpm --filter @firsttx/docs lint
```

credential을 제거한 `ai:plan` 실행은 `tsx` IPC sandbox 제약이 있으면 동일한 read-only command를 승인된 외부 실행으로 재시도한다. 기존 `ai`는 외부 mutation 명령이므로 T1 verification에서 실행하지 않는다.

## Evidence / Gap log

| 날짜       | 종류     | 내용                                                                                                                             |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | evidence | canonical reader는 source 정렬과 KO/EN document selection에 필요한 `docId`, `locale`, `source`, normalized `content`를 제공한다. |
| 2026-08-07 | evidence | current chunker와 indexing script는 같은 locale/docId/source/content 계약을 사용한다.                                            |
| 2026-08-07 | evidence | indexing과 runtime query embedding은 같은 model ID를 사용하지만 현재 literal owner가 두 곳이다.                                  |
| 2026-08-07 | evidence | 기존 `ai` 명령은 cache 삭제와 active locale namespace reset을 수행하므로 T1에서 실행하지 않는다.                                 |
| 2026-08-07 | gap      | 빈 locale과 CLI locale selection behavior는 사용자 결정이 필요하다.                                                              |
| 2026-08-08 | evidence | 사용자가 두 미정 질문을 권장안으로 확정해 gate를 닫았다.                                                                         |
| 2026-08-08 | evidence | `scripts/docs-anchors.ts -> lib/docs/anchor-contract` 선례에 맞춰 공유 계약을 `lib/ai/index-contract.ts`에 배치했다.             |
| 2026-08-08 | evidence | `readCanonicalMdxDocuments`의 `localeCompare` 정렬에 의존하지 않고 planner가 codepoint 비교로 다시 정렬해 결정성을 소유한다.     |
| 2026-08-08 | evidence | credential 5개를 제거한 `ai:plan`이 KO 9 source/88 chunk, EN 9 source/99 chunk plan을 출력하고 2회 실행 결과가 동일했다.         |
| 2026-08-08 | evidence | `plan.ts` import graph에 env, provider, cache, vector module이 없다. `main.ts` diff는 0이고 `ai` script 값도 그대로다.           |

## Closure

- 현재 verdict: CLOSED — AC-T1~T13 충족
- implementation: DONE
- verification evidence: typecheck, lint, format:check, `test:run` 5 files 23 tests, production build, credential-unset `ai:plan` 2회 모두 통과
- change risk: normal — 신규 read-only 경로이며 기존 mutation orchestration diff 없음
- evidence confidence: high — 결정성, revision sensitivity, count parity, side-effect 부재를 각각 실행으로 확인
- state drift: 없음 — 외부 provider 상태 미변경
- native review: 통과
- 다음 gate: T2 versioned run manifest SPEC 작성. 시작 전 상위 계획의 Upstash activation postcondition gate를 닫는다.

## Reconciliation log

| 날짜       | 변경                                                | 이유                                                                          | 영향                                                             |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 2026-08-07 | T1을 전체 lifecycle 문서에서 분리                   | 전체 plan과 첫 구현 계약의 ownership을 구분                                   | T1 구현은 이 packet만 gate로 사용                                |
| 2026-08-07 | 구현을 시작하지 않는 interactive packet으로 고정    | 사용자 요청이 문서화까지만 허용                                               | production/test/package 변경 없음                                |
| 2026-08-08 | 미정 질문 2개를 권장안으로 확정하고 AC-T12~T13 추가 | 사용자 답변으로 gate 종료                                                     | 빈 locale은 throw, CLI는 인자 없는 KO/EN 출력으로 고정           |
| 2026-08-08 | 검증 명령의 asdf 전제와 무효한 pnpm 플래그 교체     | 이 머신은 fnm을 쓰고 `--pm-on-fail`이 아무것도 검증하지 않음                  | asdf 있으면 우선 사용, packageManager pin 직접 비교              |
| 2026-08-08 | T1 구현과 native 검증 완료                          | 사용자 구현 시작 신호                                                         | packet verdict를 CLOSED로 전환, 다음 gate는 T2                   |
| 2026-08-08 | `IndexPlan.namespace`와 `buildIndexNamespace` 제거  | T2′ build artifact 결정으로 vector namespace 개념이 폐기됨 (code review 후속) | ai:plan 출력에서 namespace 필드 제거, revision·count 계약은 불변 |
