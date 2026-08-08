import { describe, expect, it } from "vitest";
import { getIndexSummary, searchDocs } from "./search";

describe("searchDocs", () => {
  it("keeps serving both locales across repeated calls after the packed payload is decoded and released", () => {
    const query = new Array(getIndexSummary().dimensions).fill(0.01);

    const ko = searchDocs(query, 3, 0, "ko");
    const en = searchDocs(query, 3, 0, "en");
    const koAgain = searchDocs(query, 3, 0, "ko");

    expect(ko).toHaveLength(3);
    expect(en).toHaveLength(3);
    expect(koAgain).toEqual(ko);
    expect(ko.every((result) => result.metadata.source.endsWith(".ko.mdx"))).toBe(true);
    expect(en.every((result) => result.metadata.source.endsWith(".en.mdx"))).toBe(true);
  });

  it("orders results by descending score and honors topK before minScore", () => {
    const query = new Array(getIndexSummary().dimensions).fill(0.01);
    const results = searchDocs(query, 5, 0, "ko");

    const scores = results.map((result) => result.score);
    expect([...scores].sort((left, right) => right - left)).toEqual(scores);
    expect(searchDocs(query, 5, scores[0] + 1, "ko")).toHaveLength(0);
  });
});
