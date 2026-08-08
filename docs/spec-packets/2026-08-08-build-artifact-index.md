# T2′ — build artifact 인덱스 전환

- 상태: 구현 완료, 검증 통과
- 현재 작업 분류: L-C (runtime retrieval 계약 변경 + 배포 구성)
- packet mode: interactive
- 작성일: 2026-08-08
- 상위 계획: [FirstTx Docs RAG defense plan](../plans/2026-08-07-rag-defense-plan.md)
- 선행: [T1 deterministic index plan](2026-08-07-deterministic-index-plan.md), [T5a retrieval 평가](2026-08-08-retrieval-evaluation.md)
- 대체: 상위 계획의 T2(run manifest)와 T3(staging + active pointer)

## 결정 배경

2026-08-08 실측으로 호스팅을 확정했다.

- 검색 방식은 embedding 유지 — Hit@3 85.7% vs BM25 57.1%
- 187 chunk brute-force 검색 **0.38ms**, float32 packed **1.10MB**, base64 디코드 0.3ms
- 성장 한계는 약 3,300 chunk(18배). 그 이상은 Vercel Fluid Compute
- 무료 티어 vector DB가 미사용으로 **실제 삭제**됐다. 원래 T2·T3 설계는 빌드 실패는 막지만 공급자 삭제와 문서-인덱스 drift는 막지 못한다

artifact는 저장소에 커밋한다. 빌드에 provider credential이 필요 없고, 인덱스 변경이 PR diff에 보이며, T1의 content revision으로 staleness를 CI가 강제할 수 있다.

## 목표

1. 배포된 Chat이 외부 vector DB 없이 retrieval을 수행한다.
2. 문서와 인덱스가 어긋난 채 배포될 수 없다.
3. 빌드가 provider credential 없이 성공한다.
4. 측정된 retrieval 품질(Hit@3 85.7%, MRR 0.643)이 전환 전후로 동일하다.
5. Upstash Vector 의존을 제거한다.

## 범위

- float32 packed artifact 형식과 직렬화/역직렬화
- artifact 생성 CLI (기존 `ai` 대체)
- runtime brute-force search — `lib/vector/search.ts` 대체
- artifact를 함수 번들에 포함시키는 Next.js 설정
- artifact revision과 현재 문서 revision을 대조하는 CI staleness gate
- 평가 러너를 공유 runtime search로 재배선
- README와 운영 문서 갱신

## 제외

- Redis와 rate limit — Chat 재활성화 시점의 별도 작업
- Chat 프로덕션 재활성화
- canonical 문서 어휘 보강 (`ko-6` miss 대응)
- 평가 case 변경
- chunk 경계·topK·minScore 튜닝
- retrieval inspection API와 ops UI (T5b, T6)

## 확정된 결정

2026-08-08 사용자가 4개 모두 권장안으로 확정했다.

1. **artifact 읽기 방식** → `lib/vector/index-artifact.json`을 **모듈로 import**. 번들러가 자동 포함하므로 `outputFileTracingIncludes` 누락으로 프로덕션에서만 실패하는 경로가 없다. tsc는 1.67MB JSON import를 문제없이 처리했다.
2. **형식** → base64 packed `Float32Array`. 최종 artifact 1.67MB(embeddings 1.46MB + chunk 본문).
3. **CI gate** → `pr.yml`의 `verify` job에 `ai:check-index` 단계 추가. 외부 호출이 없어 credential 불필요.
4. **기존 `ai`** → `ai:build-index`로 대체. `scripts/main.ts`, `scripts/vector.ts`, `scripts/cache.ts`와 `@upstash/vector` 의존을 제거했다.

## 도메인 계약

```ts
interface PackedIndexArtifact {
  artifactVersion: 1;
  embeddingModel: string;
  indexContractVersion: string;
  dimensions: number;
  revisions: Record<'ko' | 'en', string>;
  chunks: Array<{ id; title; section; source; content; locale }>;
  embeddings: string;
}
```

규칙:

1. `embeddings`는 `chunks` 순서대로 이어붙인 `Float32Array`의 base64다.
2. `revisions`는 T1의 `createIndexPlan`이 만든 locale별 content revision이다.
3. runtime은 `revisions`와 `embeddingModel`을 읽기 전용으로만 쓴다.
4. search는 cosine을 `(1 + cos) / 2`로 정규화해 기존 점수 의미를 보존한다.
5. topK와 minScore는 `lib/ai/rag.ts`의 기존 상수를 계속 쓴다.

## Acceptance Criteria

- AC1: `lib/vector/search.ts`가 Upstash를 import하지 않고 동일한 `SearchResult` 형태를 반환한다.
- AC2: 전환 후 `ai:evaluate`의 Hit@3와 MRR이 전환 전과 같다.
- AC3: provider credential이 전혀 없는 환경에서 `pnpm build`가 성공한다.
- AC4: 문서를 고치고 artifact를 재생성하지 않으면 CI가 실패한다.
- AC5: 배포 번들에 artifact가 포함되어 프로덕션 Chat 경로가 동작한다.
- AC6: `@upstash/vector` 의존과 `scripts/vector.ts`가 제거된다.
- AC7: score 정규화가 유지되어 기존 minScore 의미가 바뀌지 않는다.
- AC8: docs typecheck, lint, format, 전체 unit test, production build가 통과한다.
- AC9: README와 운영 문서가 새 명령과 갱신 절차를 설명한다.

## 위험

| 위험                                            | 대응                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| artifact가 번들에 안 들어가 프로덕션에서만 실패 | 미정 질문 1에서 import 방식을 택해 실패 모드 제거           |
| 문서만 고치고 artifact 갱신 누락                | CI staleness gate (AC4)                                     |
| git 비대화                                      | 문서 변경 시에만 1.46MB 갱신. 변경 빈도가 낮음              |
| corpus 성장으로 번들 압박                       | 약 3,300 chunk에서 재검토. `ai:plan`의 chunk 수로 조기 관찰 |
| 전환 중 retrieval 품질 회귀                     | 전환 전후 `ai:evaluate` 동일 수치 확인 (AC2)                |

## Verification

```bash
pnpm --filter @firsttx/docs typecheck
pnpm --filter @firsttx/docs lint
pnpm --filter @firsttx/docs test:run
pnpm --filter @firsttx/docs format:check
pnpm --filter @firsttx/docs build
pnpm --filter @firsttx/docs ai:evaluate
pnpm --filter @firsttx/docs ai:probe-unknown
```

credential을 제거한 셸에서 `build`가 통과하는지 별도로 확인한다.

## 검증 결과 (2026-08-08)

| AC                                          | 결과                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| AC1 search가 Upstash 미사용, 동일 형태 반환 | 통과 — `lib/vector/search.ts`가 artifact brute-force로 `SearchResult` 반환                |
| AC2 retrieval 품질 불변                     | **통과 — Hit@3 85.7%, MRR 0.643, miss `ko-6`·`en-2`로 전환 전과 동일**                    |
| AC3 credential 없이 build 성공              | 통과 — 5개 env 제거 후 production build 성공                                              |
| AC4 문서만 고치면 CI 실패                   | 통과 — 문서 임시 수정 시 revision 불일치로 non-zero exit 확인 후 복원                     |
| AC5 배포 번들에 artifact 포함               | 통과 — 모듈 import이므로 번들러가 포함. tracing 설정 불필요                               |
| AC6 Upstash 의존 제거                       | 통과 — `@upstash/vector`, `scripts/vector.ts`, `scripts/main.ts`, `scripts/cache.ts` 제거 |
| AC7 score 정규화 유지                       | 통과 — `(1 + cos) / 2` 유지, unit test로 고정                                             |
| AC8 native checks                           | 통과 — typecheck, lint, format, 60 tests, build                                           |
| AC9 문서 갱신                               | 통과 — README 파이프라인·명령 경계 갱신                                                   |

부수 정리: `scripts/types.ts`의 `ChunkWithEmbedding`이 이 변경으로 미사용이 되어 함께 제거했다.

## Closure

- 현재 verdict: CLOSED — AC1~AC9 충족
- implementation: DONE
- change risk: normal — runtime retrieval 구현이 바뀌었으나 인터페이스와 측정 품질은 동일하다
- state drift: 없음 — 외부 서비스 상태를 변경하지 않았다
- 다음 gate: canonical 문서 어휘 보강(`ko-6`)과 Chat 재활성화(Redis rate limit)
