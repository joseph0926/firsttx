import { buildContextBlocks } from "../lib/ai/rag";
import type { EvaluationLocale, OutOfDomainCase, RetrievalEvaluationCase } from "../evaluations/cases";

export const HIT_RANK_THRESHOLD = 3;

export interface RetrievedChunk {
  score: number;
  title: string;
  section: string;
  source: string;
  content: string;
}

export interface ScoredRetrieval {
  rank: number;
  score: number;
  source: string;
  section: string;
  matchesExpectation: boolean;
  withinContextBudget: boolean;
}

export interface RetrievalEvaluationResult {
  caseId: string;
  locale: EvaluationLocale;
  query: string;
  hitRank: number | null;
  hitScore: number | null;
  reciprocalRank: number;
  hitWithinContextBudget: boolean;
  retrieved: ScoredRetrieval[];
}

export interface OutOfDomainResult {
  caseId: string;
  locale: EvaluationLocale;
  query: string;
  absentTopic: string;
  usesInDomainVocabulary: boolean;
  resultCount: number;
  topScore: number | null;
  topSources: string[];
}

export interface SeparationAnalysis {
  minInDomainHitScore: number | null;
  maxOutOfDomainTopScore: number | null;
  separated: boolean;
  gap: number | null;
  suggestedMinScore: number | null;
  overlappingOutOfDomainCases: string[];
}

export interface EvaluationSummary {
  total: number;
  hitAt3: number;
  mrr: number;
  misses: string[];
  hitsOutsideContextBudget: string[];
}

function matchesExpectation(evaluationCase: RetrievalEvaluationCase, chunk: RetrievedChunk): boolean {
  if (!evaluationCase.expectedSources.includes(chunk.source)) {
    return false;
  }

  if (!evaluationCase.expectedSections || evaluationCase.expectedSections.length === 0) {
    return true;
  }

  return evaluationCase.expectedSections.includes(chunk.section);
}

export function markContextBudget(chunks: RetrievedChunk[]): boolean[] {
  const includedCount = buildContextBlocks(chunks).length;

  return chunks.map((_, index) => index < includedCount);
}

export function evaluateCase(evaluationCase: RetrievalEvaluationCase, chunks: RetrievedChunk[]): RetrievalEvaluationResult {
  const budget = markContextBudget(chunks);

  const retrieved: ScoredRetrieval[] = chunks.map((chunk, index) => ({
    rank: index + 1,
    score: chunk.score,
    source: chunk.source,
    section: chunk.section,
    matchesExpectation: matchesExpectation(evaluationCase, chunk),
    withinContextBudget: budget[index],
  }));

  const firstMatch = retrieved.find((entry) => entry.matchesExpectation);

  return {
    caseId: evaluationCase.id,
    locale: evaluationCase.locale,
    query: evaluationCase.query,
    hitRank: firstMatch ? firstMatch.rank : null,
    hitScore: firstMatch ? firstMatch.score : null,
    reciprocalRank: firstMatch ? 1 / firstMatch.rank : 0,
    hitWithinContextBudget: firstMatch ? firstMatch.withinContextBudget : false,
    retrieved,
  };
}

export function evaluateOutOfDomain(outOfDomainCase: OutOfDomainCase, chunks: RetrievedChunk[]): OutOfDomainResult {
  return {
    caseId: outOfDomainCase.id,
    locale: outOfDomainCase.locale,
    query: outOfDomainCase.query,
    absentTopic: outOfDomainCase.absentTopic,
    usesInDomainVocabulary: outOfDomainCase.usesInDomainVocabulary,
    resultCount: chunks.length,
    topScore: chunks.length > 0 ? Math.max(...chunks.map((chunk) => chunk.score)) : null,
    topSources: chunks.slice(0, 3).map((chunk) => `${chunk.source}#${chunk.section}`),
  };
}

export function analyzeSeparation(inDomain: RetrievalEvaluationResult[], outOfDomain: OutOfDomainResult[]): SeparationAnalysis {
  const hitScores = inDomain.map((result) => result.hitScore).filter((score): score is number => score !== null);
  const topScores = outOfDomain.map((result) => result.topScore).filter((score): score is number => score !== null);

  if (hitScores.length === 0 || topScores.length === 0) {
    return { minInDomainHitScore: null, maxOutOfDomainTopScore: null, separated: false, gap: null, suggestedMinScore: null, overlappingOutOfDomainCases: [] };
  }

  const minInDomainHitScore = Math.min(...hitScores);
  const maxOutOfDomainTopScore = Math.max(...topScores);
  const separated = minInDomainHitScore > maxOutOfDomainTopScore;

  return {
    minInDomainHitScore,
    maxOutOfDomainTopScore,
    separated,
    gap: minInDomainHitScore - maxOutOfDomainTopScore,
    suggestedMinScore: separated ? (minInDomainHitScore + maxOutOfDomainTopScore) / 2 : null,
    overlappingOutOfDomainCases: outOfDomain.filter((result) => result.topScore !== null && result.topScore >= minInDomainHitScore).map((result) => result.caseId),
  };
}

export function summarize(results: RetrievalEvaluationResult[]): EvaluationSummary {
  if (results.length === 0) {
    return { total: 0, hitAt3: 0, mrr: 0, misses: [], hitsOutsideContextBudget: [] };
  }

  const hits = results.filter((result) => result.hitRank !== null && result.hitRank <= HIT_RANK_THRESHOLD);

  return {
    total: results.length,
    hitAt3: hits.length / results.length,
    mrr: results.reduce((total, result) => total + result.reciprocalRank, 0) / results.length,
    misses: results.filter((result) => result.hitRank === null || result.hitRank > HIT_RANK_THRESHOLD).map((result) => result.caseId),
    hitsOutsideContextBudget: results.filter((result) => result.hitRank !== null && !result.hitWithinContextBudget).map((result) => result.caseId),
  };
}
