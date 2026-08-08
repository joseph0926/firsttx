import "./env";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embed } from "./embed";
import { analyzeSeparation, evaluateCase, evaluateOutOfDomain, summarize, type OutOfDomainResult, type RetrievalEvaluationResult, type RetrievedChunk } from "./evaluation-metrics";
import { OUT_OF_DOMAIN_CASES, RETRIEVAL_EVALUATION_CASES, type EvaluationLocale, type OutOfDomainCase } from "../evaluations/cases";
import { searchDocs, getIndexSummary, type SearchResult } from "../lib/vector/search";
import { buildKeywordIndex, searchKeywordIndex } from "./keyword-search";
import { INDEX_CHUNKS } from "../lib/vector/chunks";
import { RETRIEVAL_MIN_SCORE, RETRIEVAL_TOP_K } from "../lib/ai/rag";
import { EMBEDDING_MODEL_ID } from "../lib/ai/index-contract";

const LOCALES: EvaluationLocale[] = ["ko", "en"];
const RESULT_DIR = fileURLToPath(new URL("../evaluations/results", import.meta.url));

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

async function runCase(evaluationCase: (typeof RETRIEVAL_EVALUATION_CASES)[number]): Promise<RetrievalEvaluationResult> {
  return evaluateCase(evaluationCase, await retrieveFor(evaluationCase.query, evaluationCase.locale));
}

function toChunks(results: SearchResult[]): RetrievedChunk[] {
  return results.map((result) => ({
    score: result.score,
    title: result.metadata.title,
    section: result.metadata.section,
    source: result.metadata.source,
    content: result.metadata.content,
  }));
}

async function retrieveFor(query: string, locale: EvaluationLocale): Promise<RetrievedChunk[]> {
  return toChunks(searchDocs(await embed(query), RETRIEVAL_TOP_K, RETRIEVAL_MIN_SCORE, locale));
}

async function runOutOfDomainCase(outOfDomainCase: OutOfDomainCase): Promise<OutOfDomainResult> {
  return evaluateOutOfDomain(outOfDomainCase, await retrieveFor(outOfDomainCase.query, outOfDomainCase.locale));
}

function reportLocale(locale: EvaluationLocale, results: RetrievalEvaluationResult[]): void {
  const summary = summarize(results);

  console.log(`\n${locale.toUpperCase()}  cases ${summary.total}   Hit@3 ${percent(summary.hitAt3)}   MRR ${summary.mrr.toFixed(3)}`);

  for (const result of results) {
    const rank = result.hitRank === null ? "miss" : `rank ${result.hitRank}`;
    const budget = result.hitRank !== null && !result.hitWithinContextBudget ? "  [context 예산 밖]" : "";
    console.log(`  ${result.caseId.padEnd(6)} ${rank.padEnd(8)} ${result.query.slice(0, 46)}${budget}`);

    if (result.hitRank === null) {
      const actual = result.retrieved.slice(0, 3).map((entry) => `${entry.source}#${entry.section}`);
      console.log(`         대신 검색됨: ${actual.length > 0 ? actual.join(", ") : "(결과 없음)"}`);
    }
  }
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("ai:evaluate requires OPENAI_API_KEY");
  }

  const startedAt = new Date().toISOString();
  const summary = getIndexSummary();
  console.log(`index artifact: chunks ${summary.chunkCount}, ko ${summary.revisions.ko.slice(0, 12)}, en ${summary.revisions.en.slice(0, 12)}`);
  const byLocale = new Map<EvaluationLocale, RetrievalEvaluationResult[]>();

  for (const locale of LOCALES) {
    const cases = RETRIEVAL_EVALUATION_CASES.filter((entry) => entry.locale === locale);
    const results: RetrievalEvaluationResult[] = [];

    for (const evaluationCase of cases) {
      results.push(await runCase(evaluationCase));
    }

    byLocale.set(locale, results);
  }

  const all = LOCALES.flatMap((locale) => byLocale.get(locale) ?? []);
  const overall = summarize(all);

  for (const locale of LOCALES) {
    reportLocale(locale, byLocale.get(locale) ?? []);
  }

  const outOfDomain: OutOfDomainResult[] = [];
  for (const outOfDomainCase of OUT_OF_DOMAIN_CASES) {
    outOfDomain.push(await runOutOfDomainCase(outOfDomainCase));
  }

  const separation = analyzeSeparation(all, outOfDomain);

  const keywordIndexes = new Map(LOCALES.map((locale) => [locale, buildKeywordIndex(INDEX_CHUNKS, locale)] as const));
  const keywordResults = RETRIEVAL_EVALUATION_CASES.map((evaluationCase) => evaluateCase(evaluationCase, toChunks(searchKeywordIndex(keywordIndexes.get(evaluationCase.locale)!, evaluationCase.query, RETRIEVAL_TOP_K))));
  const keywordOverall = summarize(keywordResults);
  const keywordOutOfDomain = OUT_OF_DOMAIN_CASES.map((outOfDomainCase) => evaluateOutOfDomain(outOfDomainCase, toChunks(searchKeywordIndex(keywordIndexes.get(outOfDomainCase.locale)!, outOfDomainCase.query, RETRIEVAL_TOP_K))));

  console.log("\nkeyword-only recall (BM25, embedding 미사용)");
  console.log("  case    embedding   keyword");
  for (const result of all) {
    const keyword = keywordResults.find((entry) => entry.caseId === result.caseId)!;
    const embeddingRank = result.hitRank === null ? "miss" : `rank ${result.hitRank}`;
    const keywordRank = keyword.hitRank === null ? "miss" : `rank ${keyword.hitRank}`;
    console.log(`  ${result.caseId.padEnd(7)} ${embeddingRank.padEnd(11)} ${keywordRank}`);
  }
  console.log(`  Hit@3 — embedding ${percent(overall.hitAt3)} vs keyword ${percent(keywordOverall.hitAt3)}`);
  console.log(`  MRR   — embedding ${overall.mrr.toFixed(3)} vs keyword ${keywordOverall.mrr.toFixed(3)}`);

  const keywordOodWithResults = keywordOutOfDomain.filter((result) => result.resultCount > 0);
  console.log(`  OOD 질문에 결과를 반환한 비율 — embedding ${outOfDomain.filter((r) => r.resultCount > 0).length}/${outOfDomain.length} vs keyword ${keywordOodWithResults.length}/${keywordOutOfDomain.length}`);

  console.log(`\n문서에 답이 없는 질문 ${outOfDomain.length}건`);
  for (const result of outOfDomain) {
    const vocabulary = result.usesInDomainVocabulary ? "in-domain 어휘" : "무관 어휘";
    const top = result.topScore === null ? "결과 없음" : result.topScore.toFixed(4);
    console.log(`  ${result.caseId.padEnd(9)} 결과 ${result.resultCount}개  최고점 ${top}  (${vocabulary})  ${result.absentTopic}`);
  }

  console.log(`\n전체  cases ${overall.total}   Hit@3 ${percent(overall.hitAt3)}   MRR ${overall.mrr.toFixed(3)}`);
  console.log(`정답 최저 점수 ${separation.minInDomainHitScore?.toFixed(4) ?? "-"}   무관 질문 최고 점수 ${separation.maxOutOfDomainTopScore?.toFixed(4) ?? "-"}`);

  if (separation.separated) {
    console.log(`두 분포가 분리됨 (간격 ${separation.gap?.toFixed(4)}). 근거 있는 minScore 후보: ${separation.suggestedMinScore?.toFixed(4)} (현재 ${RETRIEVAL_MIN_SCORE})`);
  } else {
    console.log(`두 분포가 겹침. 점수만으로는 무관 질문을 거를 수 없다. 겹치는 case: ${separation.overlappingOutOfDomainCases.join(", ") || "-"}`);
  }

  if (overall.misses.length > 0) {
    console.log(`miss: ${overall.misses.join(", ")}`);
  }

  if (overall.hitsOutsideContextBudget.length > 0) {
    console.log(`검색됐지만 context 예산 밖: ${overall.hitsOutsideContextBudget.join(", ")}`);
  }

  const report = {
    startedAt,
    retrievalBackend: "local-artifact",
    embeddingModel: EMBEDDING_MODEL_ID,
    indexRevisions: summary.revisions,
    topK: RETRIEVAL_TOP_K,
    minScore: RETRIEVAL_MIN_SCORE,
    overall,
    byLocale: Object.fromEntries(LOCALES.map((locale) => [locale, summarize(byLocale.get(locale) ?? [])])),
    separation,
    results: all,
    outOfDomain,
    keyword: {
      overall: keywordOverall,
      results: keywordResults,
      outOfDomain: keywordOutOfDomain,
    },
  };

  fs.mkdirSync(RESULT_DIR, { recursive: true });
  const file = path.join(RESULT_DIR, `${startedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nartifact: ${path.relative(process.cwd(), file)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
