import { Index } from "@upstash/vector";

export type Locale = "ko" | "en";

export interface SearchResult {
  id: string;
  score: number;
  metadata: {
    title: string;
    section: string;
    content: string;
    source: string;
  };
}

let indexInstance: Index | null = null;

function getIndex() {
  if (indexInstance) {
    return indexInstance;
  }

  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required");
  }

  indexInstance = new Index({ url, token });
  return indexInstance;
}

export async function searchDocs(embedding: number[], topK = 5, minScore = 0.5, locale: Locale = "ko"): Promise<SearchResult[]> {
  const index = getIndex();

  const results = await index.namespace(locale).query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  return results
    .filter((r) => r.metadata)
    .filter((r) => r.score >= minScore)
    .map((r) => ({
      id: String(r.id),
      score: r.score,
      metadata: r.metadata as SearchResult["metadata"],
    }));
}
