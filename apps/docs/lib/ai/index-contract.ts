export const INDEX_CONTRACT_VERSION = "rag-index-v1";

export const EMBEDDING_MODEL_ID = "text-embedding-3-small";

export type IndexLocale = "ko" | "en";

export interface IndexPlan {
  locale: IndexLocale;
  contentRevision: string;
  sourceCount: number;
  expectedChunkCount: number;
  indexContractVersion: string;
  embeddingModel: string;
}

export interface IndexRevisionDocument {
  docId: string;
  source: string;
  content: string;
}

export interface IndexRevisionInput {
  locale: IndexLocale;
  indexContractVersion: string;
  embeddingModel: string;
  documents: IndexRevisionDocument[];
}
