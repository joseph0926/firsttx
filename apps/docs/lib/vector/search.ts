import { Index } from "@upstash/vector";

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

function getIndex() {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required");
  }

  return new Index({ url, token });
}

export async function searchDocs(embedding: number[], topK = 5): Promise<SearchResult[]> {
  const index = getIndex();

  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  return results.map((r) => ({
    id: r.id as string,
    score: r.score,
    metadata: r.metadata as SearchResult["metadata"],
  }));
}
