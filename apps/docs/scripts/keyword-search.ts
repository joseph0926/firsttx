import { embeddingInputFor, type ArtifactChunk, type ArtifactLocale } from "../lib/vector/artifact-contract";
import type { SearchResult } from "../lib/vector/search";

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export function tokenize(text: string): string[] {
  const tokens: string[] = [];

  for (const match of text.toLowerCase().matchAll(/[a-z0-9_$@./-]+|[가-힣]+/g)) {
    const token = match[0];

    if (/^[가-힣]+$/.test(token)) {
      if (token.length === 1) {
        tokens.push(token);
        continue;
      }
      for (let i = 0; i < token.length - 1; i++) {
        tokens.push(token.slice(i, i + 2));
      }
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}

interface KeywordDocument {
  chunk: ArtifactChunk;
  termFrequency: Map<string, number>;
  length: number;
}

export interface KeywordIndex {
  locale: ArtifactLocale;
  documents: KeywordDocument[];
  documentFrequency: Map<string, number>;
  averageLength: number;
}

export function buildKeywordIndex(chunks: ArtifactChunk[], locale: ArtifactLocale): KeywordIndex {
  const documents: KeywordDocument[] = chunks
    .filter((chunk) => chunk.locale === locale)
    .map((chunk) => {
      const tokens = tokenize(embeddingInputFor(chunk));
      const termFrequency = new Map<string, number>();

      for (const token of tokens) {
        termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
      }

      return { chunk, termFrequency, length: tokens.length };
    });

  const documentFrequency = new Map<string, number>();

  for (const document of documents) {
    for (const term of document.termFrequency.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const totalLength = documents.reduce((total, document) => total + document.length, 0);

  return {
    locale,
    documents,
    documentFrequency,
    averageLength: documents.length > 0 ? totalLength / documents.length : 0,
  };
}

export function searchKeywordIndex(index: KeywordIndex, query: string, topK: number): SearchResult[] {
  const queryTerms = [...new Set(tokenize(query))];
  const documentCount = index.documents.length;

  return index.documents
    .map((document) => {
      let score = 0;

      for (const term of queryTerms) {
        const frequency = document.termFrequency.get(term);
        if (!frequency) continue;

        const df = index.documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (documentCount - df + 0.5) / (df + 0.5));
        const normalizedLength = index.averageLength > 0 ? document.length / index.averageLength : 1;

        score += idf * ((frequency * (BM25_K1 + 1)) / (frequency + BM25_K1 * (1 - BM25_B + BM25_B * normalizedLength)));
      }

      return {
        id: document.chunk.id,
        score,
        metadata: {
          title: document.chunk.title,
          section: document.chunk.section,
          source: document.chunk.source,
          content: document.chunk.content,
        },
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}
