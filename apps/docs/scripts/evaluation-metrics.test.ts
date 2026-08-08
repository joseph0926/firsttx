import { describe, expect, it } from "vitest";
import { analyzeSeparation, evaluateCase, evaluateOutOfDomain, markContextBudget, summarize, type RetrievedChunk } from "./evaluation-metrics";
import { OUT_OF_DOMAIN_CASES, RETRIEVAL_EVALUATION_CASES, type OutOfDomainCase, type RetrievalEvaluationCase } from "../evaluations/cases";
import { readCanonicalMdxDocuments } from "./canonical-mdx";

function chunk(source: string, section: string, overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return { score: 0.8, title: "제목", section, source, content: "본문", ...overrides };
}

const sourceOnlyCase: RetrievalEvaluationCase = {
  id: "t-1",
  locale: "ko",
  query: "질문",
  expectedSources: ["tx.ko.mdx"],
  intent: "contract",
  layer: "tx",
};

const sectionCase: RetrievalEvaluationCase = {
  ...sourceOnlyCase,
  expectedSections: ["3. `tx.run`과 재시도(retry)"],
};

describe("evaluateCase", () => {
  it("counts a source match when no section is expected", () => {
    const result = evaluateCase(sourceOnlyCase, [chunk("tx.ko.mdx", "아무 섹션")]);

    expect(result.hitRank).toBe(1);
    expect(result.reciprocalRank).toBe(1);
  });

  it("requires the section to match when the case pins one", () => {
    const wrongSection = evaluateCase(sectionCase, [chunk("tx.ko.mdx", "1. 설치")]);
    const rightSection = evaluateCase(sectionCase, [chunk("tx.ko.mdx", "3. `tx.run`과 재시도(retry)")]);

    expect(wrongSection.hitRank).toBeNull();
    expect(rightSection.hitRank).toBe(1);
  });

  it("reports the rank of the first match, not a later one", () => {
    const result = evaluateCase(sourceOnlyCase, [chunk("overview.ko.mdx", "a"), chunk("tx.ko.mdx", "b"), chunk("tx.ko.mdx", "c")]);

    expect(result.hitRank).toBe(2);
    expect(result.reciprocalRank).toBe(0.5);
  });

  it("returns a null rank and zero reciprocal rank when nothing matches", () => {
    const result = evaluateCase(sourceOnlyCase, [chunk("overview.ko.mdx", "a")]);

    expect(result.hitRank).toBeNull();
    expect(result.reciprocalRank).toBe(0);
  });

  it("treats an empty retrieval as a miss rather than an error", () => {
    const result = evaluateCase(sourceOnlyCase, []);

    expect(result.hitRank).toBeNull();
    expect(result.retrieved).toEqual([]);
  });
});

describe("markContextBudget", () => {
  it("includes chunks until the budget is exceeded and drops everything after", () => {
    const big = "x".repeat(2500);
    const included = markContextBudget([chunk("a.mdx", "s", { content: big }), chunk("b.mdx", "s", { content: big }), chunk("c.mdx", "s", { content: "짧음" })]);

    expect(included).toEqual([true, false, false]);
  });

  it("keeps every chunk when the total stays inside the budget", () => {
    const included = markContextBudget([chunk("a.mdx", "s"), chunk("b.mdx", "s")]);

    expect(included).toEqual([true, true]);
  });

  it("flags a hit that was retrieved but cut off before reaching the prompt", () => {
    const nearlyFull = "x".repeat(3985);
    const result = evaluateCase(sourceOnlyCase, [chunk("overview.ko.mdx", "s", { content: nearlyFull }), chunk("tx.ko.mdx", "s")]);

    expect(result.hitRank).toBe(2);
    expect(result.retrieved[0].withinContextBudget).toBe(true);
    expect(result.hitWithinContextBudget).toBe(false);
  });
});

describe("summarize", () => {
  it("counts rank 3 as a hit and rank 4 as a miss", () => {
    const atThree = evaluateCase(sourceOnlyCase, [chunk("a.mdx", "s"), chunk("b.mdx", "s"), chunk("tx.ko.mdx", "s")]);
    const atFour = evaluateCase({ ...sourceOnlyCase, id: "t-2" }, [chunk("a.mdx", "s"), chunk("b.mdx", "s"), chunk("c.mdx", "s"), chunk("tx.ko.mdx", "s")]);

    const summary = summarize([atThree, atFour]);

    expect(summary.hitAt3).toBe(0.5);
    expect(summary.misses).toEqual(["t-2"]);
    expect(summary.mrr).toBeCloseTo((1 / 3 + 1 / 4) / 2);
  });

  it("returns zeroed metrics for an empty run", () => {
    expect(summarize([])).toEqual({ total: 0, hitAt3: 0, mrr: 0, misses: [], hitsOutsideContextBudget: [] });
  });
});

describe("analyzeSeparation", () => {
  const oodCase: OutOfDomainCase = { id: "ood-1", locale: "ko", query: "질문", absentTopic: "테스트", usesInDomainVocabulary: false };

  function inDomainWithHitScore(id: string, score: number) {
    return evaluateCase({ ...sourceOnlyCase, id }, [chunk("tx.ko.mdx", "s", { score })]);
  }

  it("reports a clean separation and suggests the midpoint threshold", () => {
    const analysis = analyzeSeparation([inDomainWithHitScore("a", 0.8), inDomainWithHitScore("b", 0.7)], [evaluateOutOfDomain(oodCase, [chunk("x.mdx", "s", { score: 0.6 })])]);

    expect(analysis.separated).toBe(true);
    expect(analysis.minInDomainHitScore).toBeCloseTo(0.7);
    expect(analysis.maxOutOfDomainTopScore).toBeCloseTo(0.6);
    expect(analysis.suggestedMinScore).toBeCloseTo(0.65);
    expect(analysis.overlappingOutOfDomainCases).toEqual([]);
  });

  it("reports overlap and suggests no threshold when an out-of-domain query scores as high as a real hit", () => {
    const analysis = analyzeSeparation([inDomainWithHitScore("a", 0.7)], [evaluateOutOfDomain(oodCase, [chunk("x.mdx", "s", { score: 0.75 })])]);

    expect(analysis.separated).toBe(false);
    expect(analysis.suggestedMinScore).toBeNull();
    expect(analysis.overlappingOutOfDomainCases).toEqual(["ood-1"]);
  });

  it("treats an out-of-domain case that retrieved nothing as the desired outcome", () => {
    const empty = evaluateOutOfDomain(oodCase, []);

    expect(empty.topScore).toBeNull();
    expect(empty.resultCount).toBe(0);
    expect(analyzeSeparation([inDomainWithHitScore("a", 0.7)], [empty]).minInDomainHitScore).toBeNull();
  });
});

describe("OUT_OF_DOMAIN_CASES", () => {
  it("covers both locales and includes queries that reuse in-domain vocabulary", () => {
    expect(OUT_OF_DOMAIN_CASES.filter((c) => c.locale === "ko").length).toBeGreaterThanOrEqual(3);
    expect(OUT_OF_DOMAIN_CASES.filter((c) => c.locale === "en").length).toBeGreaterThanOrEqual(3);
    expect(OUT_OF_DOMAIN_CASES.filter((c) => c.usesInDomainVocabulary).length).toBeGreaterThanOrEqual(3);
  });

  it("uses ids that do not collide with the in-domain cases", () => {
    const ids = [...RETRIEVAL_EVALUATION_CASES.map((c) => c.id), ...OUT_OF_DOMAIN_CASES.map((c) => c.id)];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names topics that are genuinely absent from the canonical documents", () => {
    const corpus = readCanonicalMdxDocuments()
      .map((d) => d.content.toLowerCase())
      .join("\n");
    const absentMarkers: Record<string, string[]> = {
      "React Native": ["react native"],
      "Vue/Svelte": ["svelte"],
      테스트: ["jest", "vitest"],
      "인증/세션": ["인증"],
      국제화: ["i18n", "국제화"],
      로드맵: ["roadmap", "로드맵"],
      라이선스: ["라이선스", "license"],
    };

    for (const [topic, markers] of Object.entries(absentMarkers)) {
      for (const marker of markers) {
        expect(corpus.includes(marker), `${topic}의 부재 근거 "${marker}"가 문서에 존재함`).toBe(false);
      }
    }
  });
});

describe("RETRIEVAL_EVALUATION_CASES", () => {
  it("holds at least 12 cases split across both locales", () => {
    expect(RETRIEVAL_EVALUATION_CASES.length).toBeGreaterThanOrEqual(12);
    expect(RETRIEVAL_EVALUATION_CASES.filter((c) => c.locale === "ko").length).toBeGreaterThanOrEqual(6);
    expect(RETRIEVAL_EVALUATION_CASES.filter((c) => c.locale === "en").length).toBeGreaterThanOrEqual(6);
  });

  it("uses unique case ids", () => {
    const ids = RETRIEVAL_EVALUATION_CASES.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every canonical document and all three layers", () => {
    const documents = readCanonicalMdxDocuments();
    const expected = new Set(RETRIEVAL_EVALUATION_CASES.flatMap((c) => c.expectedSources));

    for (const docId of new Set(documents.map((d) => d.docId))) {
      const covered = [...expected].some((source) => source.startsWith(`${docId}.`));
      expect(covered, `${docId} 문서를 기대값으로 쓰는 case가 없음`).toBe(true);
    }

    for (const layer of ["prepaint", "local-first", "tx"] as const) {
      expect(RETRIEVAL_EVALUATION_CASES.some((c) => c.layer === layer)).toBe(true);
    }
  });

  it("only references canonical documents that actually exist", () => {
    const sources = new Set(readCanonicalMdxDocuments().map((d) => d.source));

    for (const evaluationCase of RETRIEVAL_EVALUATION_CASES) {
      for (const source of evaluationCase.expectedSources) {
        expect(sources.has(source), `${evaluationCase.id}의 기대 source ${source}가 존재하지 않음`).toBe(true);
      }
    }
  });

  it("pins sections that actually exist in the expected document", () => {
    const documents = readCanonicalMdxDocuments();

    for (const evaluationCase of RETRIEVAL_EVALUATION_CASES) {
      if (!evaluationCase.expectedSections) continue;

      const headings = documents
        .filter((d) => evaluationCase.expectedSources.includes(d.source))
        .flatMap((d) =>
          d.content
            .split("\n")
            .filter((line) => /^##\s/.test(line))
            .map((line) => line.replace(/^##\s+/, "")),
        );

      for (const section of evaluationCase.expectedSections) {
        expect(headings, `${evaluationCase.id}의 기대 section이 문서에 없음`).toContain(section);
      }
    }
  });
});
