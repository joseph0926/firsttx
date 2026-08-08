import { describe, expect, it } from "vitest";
import { buildKeywordIndex, searchKeywordIndex, tokenize } from "./keyword-search";
import type { ArtifactChunk, ArtifactLocale } from "../lib/vector/artifact-contract";

function indexed(source: string, content: string, locale: ArtifactLocale = "ko", section = "섹션"): ArtifactChunk {
  return { id: `${locale}-${source}`, title: "제목", section, content, source, locale };
}

describe("tokenize", () => {
  it("emits character bigrams for Korean so particle suffixes still match", () => {
    expect(tokenize("진입점을")).toEqual(["진입", "입점", "점을"]);
    expect(tokenize("진입점")).toEqual(["진입", "입점"]);
  });

  it("keeps latin identifiers whole and lowercases them", () => {
    expect(tokenize("createFirstTxRoot 호출")).toEqual(["createfirsttxroot", "호출"]);
  });

  it("keeps single Korean characters and code-like tokens", () => {
    expect(tokenize("앱")).toEqual(["앱"]);
    expect(tokenize("@firsttx/prepaint")).toEqual(["@firsttx/prepaint"]);
  });
});

describe("buildKeywordIndex / searchKeywordIndex", () => {
  const chunks = [indexed("entry.mdx", "엔트리 포인트를 createFirstTxRoot로 교체합니다", "ko"), indexed("hooks.mdx", "useSyncedModel 훅은 서버 동기화를 담당합니다", "ko"), indexed("other-locale.mdx", "entry point replacement", "en")];
  const index = buildKeywordIndex(chunks, "ko");

  it("only indexes the requested locale", () => {
    expect(index.documents).toHaveLength(2);
  });

  it("ranks the chunk containing the exact identifier first", () => {
    const results = searchKeywordIndex(index, "createFirstTxRoot는 어디서 쓰나요", 8);

    expect(results[0].metadata.source).toBe("entry.mdx");
  });

  it("matches Korean queries across particle variations via bigrams", () => {
    const results = searchKeywordIndex(index, "엔트리 포인트 교체", 8);

    expect(results[0].metadata.source).toBe("entry.mdx");
  });

  it("returns nothing when no query term appears in the corpus", () => {
    expect(searchKeywordIndex(index, "Redux devtools extension", 8)).toEqual([]);
  });

  it("respects topK", () => {
    expect(searchKeywordIndex(index, "동기화 엔트리", 1)).toHaveLength(1);
  });
});
