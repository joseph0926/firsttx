import { describe, expect, it } from "vitest";
import { cosineSimilarity, decodeEmbeddings, embeddingInputFor, encodeEmbeddings, normalizeScore } from "./artifact-contract";

describe("encodeEmbeddings / decodeEmbeddings", () => {
  it("round-trips vectors through base64 at float32 precision", () => {
    const vectors = [
      [1, 0, -1],
      [0.5, 0.25, 0.125],
    ];
    const decoded = decodeEmbeddings(encodeEmbeddings(vectors), 2, 3);

    expect([...decoded]).toEqual([1, 0, -1, 0.5, 0.25, 0.125]);
  });

  it("rejects a payload whose float count does not match the declared shape", () => {
    const encoded = encodeEmbeddings([[1, 2, 3]]);

    expect(() => decodeEmbeddings(encoded, 2, 3)).toThrow(/expected 6/);
  });

  it("rejects ragged input rather than silently packing it", () => {
    expect(() =>
      encodeEmbeddings([
        [1, 2],
        [1, 2, 3],
      ]),
    ).toThrow(/dimensions/);
  });

  it("handles an empty index", () => {
    expect(encodeEmbeddings([])).toBe("");
    expect(decodeEmbeddings("", 0, 1536)).toEqual(new Float32Array(0));
  });
});

describe("cosineSimilarity", () => {
  const packed = new Float32Array([1, 0, 0, 1, -1, 0]);

  it("reads the vector at the given offset", () => {
    expect(cosineSimilarity([1, 0], packed, 0, 2)).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], packed, 2, 2)).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], packed, 4, 2)).toBeCloseTo(-1);
  });

  it("returns 0 for a zero-length vector instead of NaN", () => {
    expect(cosineSimilarity([0, 0], packed, 0, 2)).toBe(0);
  });
});

describe("normalizeScore", () => {
  it("reproduces the Upstash cosine mapping so minScore keeps its meaning", () => {
    expect(normalizeScore(-1)).toBe(0);
    expect(normalizeScore(0)).toBe(0.5);
    expect(normalizeScore(1)).toBe(1);
  });
});

describe("embeddingInputFor", () => {
  it("matches the string the index builder embeds", () => {
    expect(embeddingInputFor({ title: "제목", section: "섹션", content: "본문" })).toBe("제목 - 섹션\n\n본문");
  });
});
