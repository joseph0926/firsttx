import { Index } from "@upstash/vector";
import type { ChunkWithEmbedding } from "./types";

function getIndex() {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required");
  }

  return new Index({ url, token });
}

export async function upsertChunks(chunks: ChunkWithEmbedding[]): Promise<void> {
  const index = getIndex();
  const vectors = chunks.map((chunk) => ({
    id: chunk.id,
    vector: chunk.embedding,
    metadata: {
      title: chunk.title,
      section: chunk.section,
      content: chunk.content,
      source: chunk.source,
    },
  }));

  await index.upsert(vectors);
}

export async function queryVector(embedding: number[], topK = 3) {
  const index = getIndex();
  return index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
}
