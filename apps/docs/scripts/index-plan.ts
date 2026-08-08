import { createHash } from "node:crypto";
import { chunkMarkdown } from "./chunk-md";
import type { CanonicalMdxDocument } from "./canonical-mdx";
import { EMBEDDING_MODEL_ID, INDEX_CONTRACT_VERSION, type IndexPlan, type IndexRevisionInput, type IndexLocale } from "../lib/ai/index-contract";

function selectLocaleDocuments(documents: CanonicalMdxDocument[], locale: IndexLocale): CanonicalMdxDocument[] {
  return documents
    .filter((document) => document.locale === locale)
    .sort((left, right) => {
      if (left.source < right.source) return -1;
      if (left.source > right.source) return 1;
      return 0;
    });
}

export function buildRevisionInput(documents: CanonicalMdxDocument[], locale: IndexLocale): IndexRevisionInput {
  return {
    locale,
    indexContractVersion: INDEX_CONTRACT_VERSION,
    embeddingModel: EMBEDDING_MODEL_ID,
    documents: selectLocaleDocuments(documents, locale).map((document) => ({
      docId: document.docId,
      source: document.source,
      content: document.content,
    })),
  };
}

export function computeContentRevision(input: IndexRevisionInput): string {
  return createHash("sha256").update(JSON.stringify(input), "utf8").digest("hex");
}

export function createIndexPlan(documents: CanonicalMdxDocument[], locale: IndexLocale): IndexPlan {
  const selected = selectLocaleDocuments(documents, locale);

  if (selected.length === 0) {
    throw new Error(`No canonical documents found for locale "${locale}"`);
  }

  const contentRevision = computeContentRevision(buildRevisionInput(documents, locale));

  const expectedChunkCount = selected.reduce((total, document) => total + chunkMarkdown(document.content, document.docId, document.source, locale).length, 0);

  return {
    locale,
    contentRevision,
    sourceCount: selected.length,
    expectedChunkCount,
    indexContractVersion: INDEX_CONTRACT_VERSION,
    embeddingModel: EMBEDDING_MODEL_ID,
  };
}
