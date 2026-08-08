import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "./chunk-md";
import { readCanonicalMdxDocuments } from "./canonical-mdx";
import { buildRevisionInput, computeContentRevision, createIndexPlan } from "./index-plan";
import { EMBEDDING_MODEL_ID, INDEX_CONTRACT_VERSION } from "../lib/ai/index-contract";
import type { CanonicalMdxDocument } from "./canonical-mdx";

const documents: CanonicalMdxDocument[] = [
  { docId: "alpha", locale: "ko", source: "alpha.ko.mdx", content: "# Alpha\n\n## One\n\nKO alpha body.\n" },
  { docId: "beta", locale: "ko", source: "beta.ko.mdx", content: "# Beta\n\n## Two\n\nKO beta body.\n" },
  { docId: "alpha", locale: "en", source: "alpha.en.mdx", content: "# Alpha\n\n## One\n\nEN alpha body.\n" },
];

describe("createIndexPlan", () => {
  it("returns the plan contract for the requested locale", () => {
    const plan = createIndexPlan(documents, "ko");

    expect(plan).toEqual({
      locale: "ko",
      contentRevision: expect.any(String),
      sourceCount: 2,
      expectedChunkCount: expect.any(Number),
      indexContractVersion: INDEX_CONTRACT_VERSION,
      embeddingModel: EMBEDDING_MODEL_ID,
    });
  });

  it("is stable across input ordering", () => {
    const forward = createIndexPlan(documents, "ko");
    const reversed = createIndexPlan([...documents].reverse(), "ko");

    expect(reversed).toEqual(forward);
  });

  it("selects only the requested locale", () => {
    expect(createIndexPlan(documents, "en").sourceCount).toBe(1);
    expect(createIndexPlan(documents, "ko").contentRevision).not.toBe(createIndexPlan(documents, "en").contentRevision);
  });

  it("emits a 64 character lowercase sha256 revision", () => {
    expect(createIndexPlan(documents, "ko").contentRevision).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the revision when content changes", () => {
    const changed = documents.map((document) => (document.source === "alpha.ko.mdx" ? { ...document, content: `${document.content}extra\n` } : document));

    expect(createIndexPlan(changed, "ko").contentRevision).not.toBe(createIndexPlan(documents, "ko").contentRevision);
  });

  it("changes the revision when only the source name changes", () => {
    const renamed = documents.map((document) => (document.source === "alpha.ko.mdx" ? { ...document, source: "gamma.ko.mdx" } : document));

    expect(createIndexPlan(renamed, "ko").contentRevision).not.toBe(createIndexPlan(documents, "ko").contentRevision);
  });

  it("changes the revision when the contract version or embedding model changes", () => {
    const base = buildRevisionInput(documents, "ko");

    expect(computeContentRevision({ ...base, indexContractVersion: "rag-index-v2" })).not.toBe(computeContentRevision(base));
    expect(computeContentRevision({ ...base, embeddingModel: "text-embedding-3-large" })).not.toBe(computeContentRevision(base));
  });

  it("rejects a locale without canonical documents", () => {
    expect(() => createIndexPlan([], "ko")).toThrow('No canonical documents found for locale "ko"');
  });

  it("matches the real canonical reader and chunker output", () => {
    const canonical = readCanonicalMdxDocuments();

    for (const locale of ["ko", "en"] as const) {
      const selected = canonical.filter((document) => document.locale === locale);
      const expectedChunkCount = selected.reduce((total, document) => total + chunkMarkdown(document.content, document.docId, document.source, locale).length, 0);
      const plan = createIndexPlan(canonical, locale);

      expect(plan.sourceCount).toBe(selected.length);
      expect(plan.expectedChunkCount).toBe(expectedChunkCount);
    }
  });
});
