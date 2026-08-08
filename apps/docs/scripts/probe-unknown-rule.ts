import "./env";
import { generateText } from "ai";
import { CHAT_GENERATION_SETTINGS, chatModel } from "../lib/ai/openai";
import { buildContextBlocks, buildContextText, buildSystemPrompt, RETRIEVAL_MIN_SCORE, RETRIEVAL_TOP_K } from "../lib/ai/rag";
import { embed } from "./embed";
import { searchDocs, type SearchResult } from "../lib/vector/search";
import { evaluateCase, type RetrievedChunk } from "./evaluation-metrics";
import { OUT_OF_DOMAIN_CASES, RETRIEVAL_EVALUATION_CASES, type EvaluationLocale } from "../evaluations/cases";

const UNKNOWN_MARKERS = ["문서에서 찾을 수 없습니다", "cannot be found in the current documentation"];

type Compliance = "strict" | "acknowledged" | "violated";

function classify(text: string): Compliance {
  const hasMarker = UNKNOWN_MARKERS.some((marker) => text.includes(marker));
  if (!hasMarker) return "violated";

  const stripped = UNKNOWN_MARKERS.reduce((acc, marker) => acc.replace(marker, ""), text);
  const remainder = stripped.replace(/https?:\/\/\S+/g, "").replace(/\s/g, "");

  return remainder.length > 80 ? "acknowledged" : "strict";
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

async function answerFrom(chunks: RetrievedChunk[], locale: EvaluationLocale, query: string): Promise<string> {
  const { text } = await generateText({
    model: chatModel,
    ...CHAT_GENERATION_SETTINGS,
    system: buildSystemPrompt(buildContextText(chunks), locale),
    prompt: query,
  });

  return text;
}

function hasUnknownMarker(text: string): boolean {
  return UNKNOWN_MARKERS.some((marker) => text.includes(marker));
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("ai:probe-unknown requires OPENAI_API_KEY");
  }

  const tally: Record<Compliance, string[]> = { strict: [], acknowledged: [], violated: [] };

  console.log("문서에 답이 없는 질문 — UNKNOWN 규칙을 지켜야 한다");

  for (const testCase of OUT_OF_DOMAIN_CASES) {
    const chunks = await retrieveFor(testCase.query, testCase.locale);
    const text = await answerFrom(chunks, testCase.locale, testCase.query);
    const compliance = classify(text);
    tally[compliance].push(testCase.id);

    console.log(`  ${testCase.id.padEnd(9)} ${compliance.padEnd(13)} context ${buildContextBlocks(chunks).length}개  [${testCase.absentTopic}]`);
    if (compliance === "violated") {
      console.log(`    -> ${text.replace(/\n/g, " ").slice(0, 150)}`);
    }
  }

  console.log("\n문서에 답이 있는 질문 — 실제로 답해야 한다 (과잉 거부 회귀 검사)");

  const overRefused: string[] = [];
  const refusedOnRetrievalMiss: string[] = [];

  for (const testCase of RETRIEVAL_EVALUATION_CASES) {
    const chunks = await retrieveFor(testCase.query, testCase.locale);
    const retrievalFound = evaluateCase(testCase, chunks).hitRank !== null;
    const text = await answerFrom(chunks, testCase.locale, testCase.query);

    if (!hasUnknownMarker(text)) continue;

    if (retrievalFound) {
      overRefused.push(testCase.id);
      console.log(`  ${testCase.id.padEnd(6)} 과잉 거부       정답이 context에 있는데 거부함`);
    } else {
      refusedOnRetrievalMiss.push(testCase.id);
      console.log(`  ${testCase.id.padEnd(6)} 정당한 거부     retrieval이 정답을 못 찾음`);
    }
  }

  console.log(`\n=== out-of-domain ${OUT_OF_DOMAIN_CASES.length}건 ===`);
  console.log(`strict       (UNKNOWN 문구만 반환)        ${tally.strict.length}  ${tally.strict.join(", ")}`);
  console.log(`acknowledged (UNKNOWN + 주변 정보 추가)   ${tally.acknowledged.length}  ${tally.acknowledged.join(", ")}`);
  console.log(`violated     (UNKNOWN 없이 답변 생성)     ${tally.violated.length}  ${tally.violated.join(", ")}`);
  console.log(`\n=== in-domain ${RETRIEVAL_EVALUATION_CASES.length}건 ===`);
  console.log(`과잉 거부    ${overRefused.length}  ${overRefused.join(", ") || "없음"}`);
  console.log(`정당한 거부  ${refusedOnRetrievalMiss.length}  ${refusedOnRetrievalMiss.join(", ") || "없음"} (retrieval 문제이며 프롬프트 문제가 아님)`);

  if (tally.violated.length > 0 || overRefused.length > 0) {
    console.log(`\n판정: 실패 — 위반 ${tally.violated.length}건, 과잉 거부 ${overRefused.length}건`);
  } else {
    console.log(`\n판정: 이번 실행은 통과. 위반이 간헐적이므로 여러 번 실행해 확인한다.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
