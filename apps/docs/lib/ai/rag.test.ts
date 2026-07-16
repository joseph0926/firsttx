import { describe, expect, it, vi } from "vitest";

vi.mock("./embeddings", () => ({ getEmbedding: vi.fn() }));
vi.mock("../vector/search", () => ({ searchDocs: vi.fn() }));

import { buildSystemPrompt } from "./rag";

describe("buildSystemPrompt", () => {
  it("builds a Korean prompt with retrieved context", () => {
    const result = buildSystemPrompt("문서 컨텍스트", "ko");

    expect(result).toContain("한국어로 답변하세요");
    expect(result).toContain("문서 컨텍스트");
  });

  it("builds an English prompt with retrieved context", () => {
    const result = buildSystemPrompt("Documentation context", "en");

    expect(result).toContain("Answer in English");
    expect(result).toContain("Documentation context");
  });

  it("uses the locale-specific no-context message", () => {
    expect(buildSystemPrompt("", "ko")).toContain("관련 문서가 검색되지 않았습니다");
    expect(buildSystemPrompt("", "en")).toContain("No relevant documents were found");
  });
});
