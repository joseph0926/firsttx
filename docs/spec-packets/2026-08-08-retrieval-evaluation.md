# T5a — 고정 질문 retrieval 평가

- 상태: 구현 완료, 측정은 credential 부재로 차단
- 현재 작업 분류: M-C
- packet mode: interactive
- 작성일: 2026-08-08
- 상위 계획: [FirstTx Docs RAG defense plan](../plans/2026-08-07-rag-defense-plan.md)
- 선행 task: [T1 deterministic index plan](2026-08-07-deterministic-index-plan.md) (완료)

## 범위 분리 이유

상위 계획의 T5는 retrieval inspection API와 고정 질문 평가를 함께 묶는다. 이 packet은 그중 **평가 러너만** 소유하고 HTTP API와 ops UI는 T5b로 미룬다.

근거는 두 가지다.

1. 평가 러너는 lifecycle 기계장치(T2 manifest, T3 activation)에 의존하지 않는다. 현재 `ko`, `en` namespace에 그대로 실행할 수 있으므로 T2보다 먼저 값을 낸다.
2. 2026-08-08 논의에서 vector DB 의존 자체를 재검토하기로 했다. 검색 구조를 바꾸든 유지하든 **바꾸기 전후를 비교할 자**가 먼저 필요하고, 그 자가 이 packet이다. 반대로 T5b의 retrieval API는 canonical href helper와 rate limit 예산 gate에 묶여 있어 지금 닫을 이유가 약하다.

## 내가 이해한 요청

"검색 품질이 문제인가, 안정성이 문제인가"를 감이 아니라 숫자로 판정한다. KO/EN 고정 질문을 실행 전에 확정하고, 현재 runtime과 같은 경로로 검색해 Hit@3와 MRR을 재현 가능한 artifact로 남긴다.

## 현재 확정된 것

- runtime 검색 경로는 `retrieveContext(query, 8, locale)` -> `searchDocs(embedding, 8, 0.5, locale)`이다.
- 고정 namespace는 `ko`, `en`이고 minScore는 0.5, topK는 8이다.
- chunk `id`는 `{locale}-{docId}-{n}` 형식의 **위치 기반**이라 문서 편집 시 밀린다. 평가 case는 `id`를 고정하지 않는다.
- `source`(`troubleshooting.ko.mdx`)와 `section`(H2 제목)은 안정적이므로 기대값의 기준으로 쓴다.
- 평가는 외부 상태를 읽기만 한다. embedding 생성과 vector query만 수행하고 upsert, reset, pointer 변경을 하지 않는다.
- 평가 case는 실행 결과를 보기 전에 확정한다. 과적합 방지가 이 task의 핵심 제약이다.

## 해소된 질문

1~2번은 2026-08-08 사용자가 권장안으로 확정했고, 3번은 측정 정합성 문제라 구현자가 판단했다.

1. **Hit 판정 단위** → **source + section**. case가 `expectedSections`를 주면 둘 다 일치해야 hit다. `tx.ko.mdx`처럼 chunk가 많은 문서에서 아무 조각이나 맞힌 것을 성공으로 세면 metric이 낙관적으로 부푼다.
2. **결과 커밋 여부** → **case만 커밋**. 실행 결과는 `apps/docs/evaluations/results/`에 timestamp 파일로 남기고 gitignore한다.
3. **query embedding 캐시** → **쓰지 않는다**. 현재 캐시 key(`lib/cache/embedding-cache.ts`)는 model을 포함하지 않는 text hash라 모델 변경 뒤 옛 embedding을 돌려줘 측정값을 오염시킨다. 러너는 `scripts/embed.ts`의 uncached 경로를 쓴다.

## 목표

1. KO/EN 고정 질문으로 Hit@3와 MRR을 반복 측정한다.
2. miss를 숨기지 않고 어떤 질문이 무엇을 대신 검색했는지 남긴다.
3. 같은 index와 같은 case에서 결과가 재현된다.
4. 검색 성공과 **프롬프트 도달**을 분리해 관찰한다.
5. 이후 검색 구조를 바꿀 때 같은 자로 전후를 비교한다.

## 범위

- `RetrievalEvaluationCase` 계약과 KO/EN 14개 case 파일
- 현재 runtime과 같은 경로로 검색하는 평가 러너
- Hit@3, MRR, per-case miss 기록 계산
- context truncation 도달 여부 기록
- `ai:evaluate` package script
- metric 계산 로직의 unit test (외부 호출 없이 fixture로)
- 결과 artifact schema

## 제외

- retrieval HTTP API와 ops UI (T5b)
- `IndexRun`, active pointer와 lifecycle 연동 (T2~T4)
- 생성 답변 정확도 자동 판정 (LLM-as-judge)
- minScore, topK, chunk 경계 튜닝 — 이번엔 **측정만** 하고 바꾸지 않는다
- 검색 구조 변경 (vector -> BM25/build artifact 등)
- 기존 `ai`, `ai:plan` 동작 변경

## 도메인 계약

```ts
interface RetrievalEvaluationCase {
  id: string;
  locale: 'ko' | 'en';
  query: string;
  expectedSources: string[];
  expectedSections?: string[];
  intent: 'symptom' | 'contract';
  layer: 'prepaint' | 'local-first' | 'tx' | 'general';
}

interface RetrievalEvaluationResult {
  caseId: string;
  locale: 'ko' | 'en';
  hitRank: number | null;
  reciprocalRank: number;
  retrieved: Array<{
    rank: number;
    score: number;
    source: string;
    section: string;
    withinContextBudget: boolean;
  }>;
}
```

규칙:

1. `hitRank`는 기대값과 일치하는 첫 결과의 1-based rank이며 없으면 `null`이다.
2. `expectedSections`가 있으면 `source`와 `section`이 모두 일치해야 hit다. 없으면 `source`만 본다.
3. `reciprocalRank`는 `hitRank`가 있으면 `1 / hitRank`, 없으면 `0`이다.
4. Hit@3는 `hitRank !== null && hitRank <= 3`인 case의 비율이다.
5. MRR은 전체 case `reciprocalRank`의 평균이다.
6. `withinContextBudget`은 그 chunk가 4,000자 context 예산 안에 들어가 실제 프롬프트에 도달하는지를 뜻한다. metric에는 넣지 않고 진단 정보로만 남긴다.
7. minScore 0.5에 걸려 결과가 비면 그 case는 `hitRank: null`이다. 이것도 정상적인 측정 결과이며 실패로 숨기지 않는다.

## 고정 평가 case 초안

문서 9개를 모두 덮고, 세 layer 각각에 증상형과 계약형을 배치했다. 질문 문구는 문서 표현을 그대로 쓰지 않고 사용자가 쓸 법한 말로 적었다.

| #    | locale | layer       | intent   | query                                                                    | expectedSources                                | expectedSections                            |
| ---- | ------ | ----------- | -------- | ------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------- |
| ko-1 | ko     | prepaint    | symptom  | 재방문해도 매번 빈 화면부터 시작해요. 저장된 화면이 왜 안 쓰이나요?      | `troubleshooting.ko.mdx`                       | Prepaint가 replay되지 않음                  |
| ko-2 | ko     | prepaint    | contract | 복원된 화면에서 버튼이 안 눌리는데 버그인가요?                           | `troubleshooting.ko.mdx`, `prepaint.ko.mdx`    | —                                           |
| ko-3 | ko     | local-first | contract | useModel이랑 useSyncedModel 중에 뭘 써야 하나요?                         | `local-first.ko.mdx`                           | 2. React 훅: `useModel` vs `useSyncedModel` |
| ko-4 | ko     | tx          | symptom  | 타임아웃이 났는데 서버 요청이 계속 진행돼요                              | `troubleshooting.ko.mdx`, `tx.ko.mdx`          | —                                           |
| ko-5 | ko     | general     | contract | 우리 앱에 이 라이브러리가 맞는지 어떻게 판단하나요?                      | `overview.ko.mdx`                              | 3. 어떤 앱에 잘 맞나요?                     |
| ko-6 | ko     | general     | contract | 앱 진입점을 어떻게 바꿔야 하나요?                                        | `getting-started.ko.mdx`                       | —                                           |
| ko-7 | ko     | general     | contract | 세 기능을 같이 쓸 때 어떤 순서로 붙이나요?                               | `patterns.ko.mdx`, `overview.ko.mdx`           | —                                           |
| en-1 | en     | prepaint    | symptom  | Revisiting the app still shows a blank screen instead of the cached view | `troubleshooting.en.mdx`                       | Prepaint does not replay                    |
| en-2 | en     | local-first | symptom  | The data is empty on the very first render                               | `troubleshooting.en.mdx`, `local-first.en.mdx` | —                                           |
| en-3 | en     | tx          | contract | Does the step that failed also get its compensation run?                 | `troubleshooting.en.mdx`, `tx.en.mdx`          | —                                           |
| en-4 | en     | tx          | contract | How do I make a transaction step retry on failure?                       | `tx.en.mdx`                                    | 3. `tx.run` and retry                       |
| en-5 | en     | general     | symptom  | Some fields look empty in the debugging panel                            | `troubleshooting.en.mdx`, `devtools.en.mdx`    | —                                           |
| en-6 | en     | general     | contract | Where can I look up every option this library accepts?                   | `reference.en.mdx`                             | —                                           |
| en-7 | en     | local-first | contract | How do I keep two browser tabs in sync?                                  | `local-first.en.mdx`                           | 3. Multi-tab sync & BroadcastChannel        |

covered documents: `troubleshooting`, `prepaint`, `local-first`, `tx`, `overview`, `getting-started`, `patterns`, `devtools`, `reference` — 9/9.

## CLI 계약

```bash
pnpm --filter @firsttx/docs ai:evaluate
```

- 두 locale의 case를 모두 실행하고 locale별 Hit@3, MRR과 전체 요약을 stdout에 사람이 읽는 형태로 출력한다.
- raw 결과는 결과 디렉터리에 timestamp 파일로 남긴다.
- Hit@3가 임계 미만이면 miss 목록을 함께 출력한다. 프로세스는 실패로 종료하지 않는다. 이번 task의 목적은 gate가 아니라 측정이다.
- credential이 없으면 stable message와 non-zero exit로 거절한다.

## Acceptance Criteria

- AC-E1: KO/EN 합계 14개 case가 저장소에 고정되고 9개 문서를 모두 덮는다.
- AC-E2: hit 판정, MRR, Hit@3 계산이 외부 호출 없는 fixture unit test로 검증된다.
- AC-E3: 러너가 runtime과 같은 embedding model, chunk 경계, embedding 입력 문자열, topK, minScore와 score 정규화를 사용한다.
- AC-E4: 결과 artifact에 case별 rank, score, source, section과 miss가 남는다.
- AC-E5: 같은 index와 case에서 **metric이** 재현된다. 정확한 rank 순서는 embedding provider가 결정적이지 않아 보장 대상이 아니다.
- AC-E6: 평가 실행이 upsert, reset, pointer를 변경하지 않는다.
- AC-E7: docs typecheck, lint, format:check와 전체 unit test가 통과한다.
- AC-E8: 실행 결과 요약과 해석이 상위 계획에 기록된다.

## Verification map

| Claim                                       | Type              | 연결 AC  | Planned evidence                            | Safety        |
| ------------------------------------------- | ----------------- | -------- | ------------------------------------------- | ------------- |
| C1 metric 계산이 정확함                     | executable        | AC-E2    | fixture unit test                           | safe-no-write |
| C2 case가 문서 전체를 덮고 실행 전에 고정됨 | static            | AC-E1    | case 파일 리뷰, 이 packet의 초안 표         | safe-no-write |
| C3 러너가 runtime 경로와 동일함             | static            | AC-E3    | call-site diff review                       | safe-no-write |
| C4 실행이 외부 상태를 바꾸지 않음           | static/executable | AC-E6    | import graph 검토, 실행 전후 namespace 확인 | external-read |
| C5 결과가 재현됨                            | executable        | AC-E4~E5 | 2회 실행 비교                               | external-read |

## 실행 승인 경계

`ai:evaluate`는 외부 호출을 한다. 규모는 다음과 같다.

- OpenAI embedding 14회 (질의당 1회, 합계 약 500 토큰 미만)
- Upstash Vector query 14회

둘 다 읽기이고 예상 비용은 1센트 미만이지만, 상위 계획의 "외부 상태를 읽거나 바꾸는 검증"에 해당하므로 **사용자 승인 뒤에 실행한다.** 구현과 unit test까지는 승인 없이 진행할 수 있다.

## Evidence / Gap log

| 날짜       | 종류     | 내용                                                                                                                                                                      |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-08 | evidence | chunk `id`가 위치 기반이라 기대값 기준으로 부적합함을 실제 chunk 출력으로 확인했다.                                                                                       |
| 2026-08-08 | evidence | runtime은 topK 8, minScore 0.5, 고정 locale namespace를 사용한다.                                                                                                         |
| 2026-08-08 | evidence | `lib/cache/embedding-cache.ts` key에 model이 없어 모델 변경 뒤 측정 오염 위험이 있다.                                                                                     |
| 2026-08-08 | evidence | 초안 14개 case의 기대 source와 section이 실제 canonical 문서에 존재함을 unit test로 검증했다.                                                                             |
| 2026-08-08 | evidence | `scripts/embed.ts`가 OpenAI client를 모듈 로드 시점에 생성해, credential guard보다 먼저 SDK stack trace로 터졌다. `vector.ts`, `search.ts`와 같은 lazy 패턴으로 교정했다. |
| 2026-08-08 | evidence | runtime의 topK 8과 minScore 0.5를 `lib/ai/rag.ts` 상수로 승격해 러너와의 drift를 구조적으로 제거했다. chat route의 중복 literal도 상수 참조로 바꿨다.                     |
| 2026-08-08 | gap      | 로컬 `.env.local`에 `OPENAI_API_KEY`가 없어 실제 측정을 실행하지 못했다. Upstash Vector credential 4종은 존재한다.                                                        |

## 측정 결과 (2026-08-08)

Upstash 무료 티어 DB 2개가 미사용으로 삭제돼 있어(Vector: 빈 응답, Redis: 연결 실패) 사용자 승인 아래 로컬 artifact 경로로 측정했다. 프로덕션 `firsttx.store`는 정상이고 Chat이 노출되지 않아 긴급도는 없었다.

> **정정 (2026-08-08 후속)**: 아래 100%는 case 14건 중 7건이 `expectedSections`를 지정하지 않아 **source 단위로만 판정**된 결과다. 사용자가 확정한 판정 단위는 "source + section"이었으므로 이는 계약 위반이었다. 7건에 섹션을 고정한 뒤 재측정한 정직한 값은 **Hit@3 85.7%, MRR 0.643**이다. 아래 표는 기록으로 남긴다.

| 지표                       | KO        | EN        | 전체      |
| -------------------------- | --------- | --------- | --------- |
| cases                      | 7         | 7         | 14        |
| Hit@3 (느슨한 source 판정) | 100%      | 100%      | 100%      |
| **Hit@3 (섹션 고정 후)**   | **85.7%** | **85.7%** | **85.7%** |
| **MRR (섹션 고정 후)**     | **0.595** | **0.690** | **0.643** |

섹션 고정 후 드러난 실제 miss 2건:

- `ko-6` "앱 진입점을 어떻게 바꿔야 하나요?" — 정답 섹션 `3. 엔트리 포인트 교체 (createFirstTxRoot)`가 top-8에 아예 없다. 대신 overview와 getting-started의 다른 섹션이 잡힌다. 점수가 0.624~0.649로 극도로 평평해 변별력이 없다.
- `en-2` "The data is empty on the very first render" — `Local-First data is not ready`를 못 찾고 getting-started의 훅 사용 섹션이 잡힌다.

이 정정은 **결과를 본 뒤 기대값을 조인 것**이므로 사전 등록된 측정이 아니다. 다만 판정 단위를 원래 확정안에 맞춘 것이지 숫자를 맞추려 조정한 것은 아니다.

- artifact: 187 chunk, JSON 5.47 MB (float를 십진 문자열로 저장한 크기이며 Float32 base64면 약 1.5 MB)

### 함께 드러난 사실

1. **`minScore: 0.5`는 사실상 no-op이다.** Upstash는 cosine을 `(1 + cos) / 2`로 정규화하므로 0.5는 raw cosine 0.0을 뜻한다. 관측된 최저 점수는 0.6240(raw cosine 0.248)이었고 **112개 결과 중 0개가 걸러졌다.** 의도한 품질 임계처럼 보이지만 음의 유사도만 제거한다.
2. **topK 8의 약 40%는 프롬프트에 도달하지 못한다.** 4,000자 context 예산 안에 들어간 chunk는 case당 평균 4.8개였다. 다만 **모든 hit는 예산 안에 있었으므로** 이번 case에서 실제 손실은 없었다.
3. **metric은 재현되지만 정확한 rank 순서는 아니다.** 2회 실행에서 Hit@3와 MRR, 모든 hitRank는 동일했으나 112개 중 72개 점수가 최대 2.1e-4 차이를 보여 근접 결과의 순서가 바뀌었다. 원인은 OpenAI embedding의 비결정성이다. query embedding을 캐시하면 bit-stable해지지만, 현재 캐시 key에 model이 없어 그 대가로 모델 변경 시 오염을 얻는다. model 포함 cache key(상위 계획 P1)가 이 둘을 동시에 푼다.

### 2026-08-08 추가 측정 — out-of-domain 8건

기존 14건은 모두 답이 존재하는 질문이라 **답이 없는 질문 경로가 미검증**이었다. 문서에 실제로 부재한 주제 8건(KO 4 / EN 4)을 추가했고, 절반은 의도적으로 in-domain 어휘를 재사용한다(`트랜잭션 보상 로직의 단위 테스트`, `Prepaint 스냅샷에서 다국어`). 부재 근거는 unit test가 corpus 문자열로 검증한다.

| 항목                        | 값                                                      |
| --------------------------- | ------------------------------------------------------- |
| OOD 질문이 결과를 받은 비율 | **8/8** — 전부 topK 8개를 가득 채워 반환                |
| 정답의 최저 점수            | 0.6332                                                  |
| OOD 질문의 최고 점수        | **0.7966** (`FirstTx를 React Native에서 쓸 수 있나요?`) |
| 두 분포                     | **완전히 겹침.** 8건 전부가 정답 최저점보다 높다        |

**결론: `minScore`는 튜닝으로 고칠 수 없다.** 0.5가 no-op인 것이 문제가 아니라, 어떤 값을 넣어도 out-of-domain 질문을 거르면서 정답을 지키는 임계값이 존재하지 않는다. 0.65로 올리면 OOD 8건이 그대로 통과하면서 정답만 잘려 나간다. retrieval 층에는 방어선이 없고, 유일한 방어는 프롬프트의 UNKNOWN 규칙이다.

### UNKNOWN 규칙 실측 (`ai:probe-unknown`, 4회 × 8건 = 32 generation)

| 분류         | 뜻                            | 관측                            |
| ------------ | ----------------------------- | ------------------------------- |
| strict       | UNKNOWN 문구만 반환           | 대체로 EN 3건이 고정적으로 해당 |
| acknowledged | UNKNOWN 문구 + 주변 정보 병기 | KO 3건 + EN 1건이 대체로 해당   |
| **violated** | UNKNOWN 없이 답을 생성        | **32건 중 2건**                 |

- 위반 2건은 `ood-ko-2`(1회), `ood-ko-4`(1회)로 **모두 KO이고 모두 in-domain 어휘 재사용 case**다.
- 같은 질문이 실행마다 다르게 분류된다. 즉 **위반은 결정적이지 않고 간헐적**이며, 1회 실행으로는 안전하다고 판정할 수 없다.
- 위반 사례는 순수 날조가 아니라 "문서에 구체적 API는 없다"고 인정한 뒤 **문서가 주지 않은 지침을 이어서 생성**하는 형태였다.
- EN 4건에서는 4회 실행 내내 위반이 없었다. KO 프롬프트가 EN보다 약할 가능성이 있으나 표본이 작아 단정하지 않는다.

### UNKNOWN 규칙 수정과 재측정 (2026-08-08)

위반의 원인은 프롬프트 안의 충돌이었다. `### 답변 형식`의 "확실하지 않은 내용은 '문서에서 확인이 필요합니다'라고 명시하세요"가 **UNKNOWN 규칙의 탈출구**로 작동해, 모델이 "문서에 없다"고 인정한 뒤 문서에 없는 지침을 이어 쓰는 것을 허용했다.

UNKNOWN 규칙을 KO/EN 대칭으로 3갈래 판정으로 교체했다.

1. CONTEXT가 질문에 답한다 → 답한다
2. CONTEXT가 관련은 있으나 답하지 않는다 → CONTEXT에 실제 있는 사실만 짧게 전하고 UNKNOWN 문장을 포함한다. **문서에 없는 방법·절차·권장사항을 이어서 설명하지 않는다**
3. CONTEXT가 무관하다 → UNKNOWN 문장만 반환한다

과잉 거부를 막기 위해 "CONTEXT에 답이 있는데 UNKNOWN으로 회피하지 말 것"과 "애매하면 1번이나 2번"을 함께 명시했고, 충돌하던 탈출구 문장은 제거했다.

|                                          | 변경 전  | 변경 후                   |
| ---------------------------------------- | -------- | ------------------------- |
| violated (UNKNOWN 없이 생성)             | 2 / 32   | **0 / 56**                |
| 과잉 거부 (정답이 context에 있는데 거부) | 1건 관측 | 1건 관측 (`en-5`, 간헐적) |

`en-5`의 간헐적 과잉 거부는 변경 전 baseline에도 있었으므로 이번 변경이 만든 회귀가 아니다.

probe도 함께 고쳤다. 기존에는 `ko-6`처럼 **retrieval이 정답을 못 찾은 경우의 거부까지 과잉 거부로 집계**했는데, 이는 오히려 올바른 동작이다. 이제 정답이 실제로 context에 있는지 확인한 뒤 `과잉 거부`와 `정당한 거부`를 분리한다.

### miss 2건 진단과 keyword-only recall probe (2026-08-08)

**miss 진단** — 정답 섹션의 전체 corpus 내 순위를 직접 계산했다.

- `ko-6` "앱 진입점을 어떻게 바꿔야 하나요?": 정답 `3. 엔트리 포인트 교체`가 **14위/88** (0.6145, 1위와 0.0347 차). 원인은 어휘 간극이다 — 질문은 "진입점", 문서는 "엔트리 포인트"만 쓴다.
- `en-2` "The data is empty on the very first render": 정답 `Local-First data is not ready`가 **9위/99** (0.6681, 1위와 0.0151 차). top-8에서 한 계단 모자라고, top 10 점수폭이 0.015로 평평해 순위가 사실상 동률이다.

**keyword-only recall** ([[llm-retrieval/retrieval-architecture-selection]]의 검증 probe) — BM25(한국어 문자 bigram 토큰화, latin 식별자 보존)를 같은 chunk corpus에 돌려 임베딩과 비교했다. 순수 로컬 계산이며 API 호출이 없다.

| 지표                  | embedding | keyword (BM25)                                                        |
| --------------------- | --------- | --------------------------------------------------------------------- |
| Hit@3                 | **85.7%** | 57.1%                                                                 |
| MRR                   | **0.643** | 0.387                                                                 |
| keyword만의 추가 miss | —         | `en-1`(패러프레이즈), `en-6`(공유 어휘 없음), `ko-5`·`ko-7` rank 하락 |
| OOD 8건에 결과 반환   | 8/8       | **8/8 — keyword도 OOD를 거르지 못함**                                 |

판정:

1. **query 어휘 축은 임베딩 쪽으로 기운다.** 사용자형 질문의 상당수가 패러프레이즈("blank screen" vs "does not replay")라 keyword가 크게 진다. 임베딩 유사도는 이 corpus에서 값어치를 실증했다. — 단, 이는 **검색 방식**의 판정이며 vector DB 호스팅 판정이 아니다. 로컬 artifact로 같은 품질이 나온다는 사실은 그대로다.
2. **keyword도 OOD를 거르지 못한다.** OOD 질문이 in-domain 일반 어휘(앱, Prepaint, package)를 포함하므로 BM25도 8/8 결과를 반환했다. "keyword 검색이면 자연히 무관 질문이 걸러진다"는 가설은 이 질문 세트에서 기각됐다.
3. **miss 2건은 검색 방식의 문제가 아니라 문서 어휘 공백이다.** `ko-6`은 embedding과 keyword가 **둘 다** miss다. "진입점"이라는 사용자 어휘가 canonical 문서에 존재하지 않는 한 어떤 검색도 이길 수 없다. 대응은 retrieval 튜닝이 아니라 **canonical MDX에 동의어를 병기**하는 콘텐츠 수정이다(예: "엔트리 포인트(진입점)"). 이는 화면 문서와 RAG가 source를 공유하므로 화면에도 보이는 변경이며, 별도 승인 대상으로 남긴다.

### canonical 문서 어휘 보강과 재측정 (2026-08-08)

miss 2건의 원인이 corpus 어휘 공백이었으므로 canonical MDX 본문에 사용자 어휘를 병기했다. **heading은 건드리지 않았다** — anchor ID와 deep link, TOC ownership, 그리고 평가 case의 `expectedSections`가 모두 heading에 묶여 있다.

| 파일                     | 변경                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `getting-started.ko.mdx` | "앱의 **진입점**에서 ... 진입점을 바꾸는 곳은 보통 `main.tsx`입니다" |
| `getting-started.en.mdx` | "In your app **entry point** ... usually `main.tsx`" (KO/EN 대칭)    |
| `troubleshooting.ko.mdx` | "그래서 **첫 렌더**에서는 data가 **비어** 보일 수 있습니다"          |
| `troubleshooting.en.mdx` | "The data can therefore look **empty** on the very **first render**" |

| 지표                 | 보강 전 | 보강 후                         |
| -------------------- | ------- | ------------------------------- |
| Hit@3 (embedding)    | 85.7%   | **100%**                        |
| MRR                  | 0.643   | **0.750** (KO 0.667 / EN 0.833) |
| `ko-6`               | miss    | **rank 2**                      |
| `en-2`               | miss    | **rank 1**                      |
| Hit@3 (keyword/BM25) | 57.1%   | 71.4%                           |

**keyword도 함께 올랐다는 점이 중요하다.** 임베딩만 좋아졌다면 특정 검색기에 대한 최적화를 의심해야 하지만, 어휘 자체가 없던 문제였으므로 두 검색 방식이 같이 개선됐다. 진단이 맞았다는 독립 신호다.

### 이 100%를 읽는 법

**`ko-6`과 `en-2`는 더 이상 독립 증거가 아니다.** 그 두 case 때문에 문서를 고쳤으므로, 두 case의 통과는 "고친 것이 의도대로 동작한다"는 확인이지 검색 품질의 독립 측정이 아니다. 나머지 12건은 문서 변경 전에 이미 통과했으므로 영향받지 않는다.

앞으로 실제 사용자 질문에서 새 case를 추가할 때가 독립 검증 시점이다.

### 해석의 한계

- 14개 case는 구현자가 문서를 읽고 작성했다. 실행 전에 고정했고 기대 section 실존을 test로 검증했지만, **문서에 있는 어휘로 질문했다는 편향**은 남는다. 문서에 없는 표현으로 묻는 실제 사용자를 대표하지 않는다.
- OOD 8건과 32회 generation은 위반율을 정밀하게 추정하기엔 작은 표본이다. "32건 중 2건"을 위반율 6%로 읽지 않는다. 확인된 것은 **위반이 실재하고 KO in-domain 어휘 case에 몰린다**는 사실이며, 정확한 비율은 표본을 키워야 한다.
- 이번 측정은 로컬 brute-force 결과다. 삭제된 Upstash 인덱스와 같은 embedding·같은 cosine·같은 정규화·같은 topK를 쓰고 벡터가 187개뿐이라 근사 최근접이 완전 탐색과 일치하므로 **동등하다고 판단**하지만, 실측 A/B는 아니다.

## Closure

- 현재 verdict: CLOSED — AC-E1~E8 충족
- implementation: DONE
- verification evidence: typecheck, lint, format:check, 전체 unit test, production build 통과. `ai:evaluate` 2회 실행으로 metric 재현 확인. `ai:plan` revision 회귀 없음
- change risk: normal — 평가 경로는 신규이고, runtime 변경은 상수 추출과 lazy client 교정뿐이며 값과 동작은 동일하다
- state drift: 없음 — 외부 vector/Redis 상태를 변경하지 않았다(대상 DB가 이미 삭제된 상태였고 로컬 artifact로 측정했다)
- 다음 gate: 이번 측정이 상위 계획의 **retrieval 구조 결정**에 입력된다. T2 착수 전에 vector DB를 되살릴지 build artifact로 갈지 판단한다.
