import { Index } from "@upstash/vector";
import type { ChunkWithEmbedding, Locale } from "./types";

let indexInstance: Index | null = null;

function getIndex() {
  if (indexInstance) return indexInstance;

  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) {
    throw new Error("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required");
  }

  indexInstance = new Index({ url, token });
  return indexInstance;
}

export async function resetNamespace(namespace: Locale): Promise<void> {
  const index = getIndex();
  console.log(`Resetting namespace "${namespace}"...`);
  await index.namespace(namespace).reset();
  console.log(`Namespace "${namespace}" reset complete`);
}

export async function upsertChunks(chunks: ChunkWithEmbedding[], namespace: Locale): Promise<void> {
  const index = getIndex();
  const BATCH_SIZE = 500;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const vectors = batch.map((chunk) => ({
      id: chunk.id,
      vector: chunk.embedding,
      metadata: {
        title: chunk.title,
        section: chunk.section,
        source: chunk.source,
        content: chunk.content,
      },
    }));

    console.log(`Upserting batch ${i / BATCH_SIZE + 1} to namespace "${namespace}" (${vectors.length} vectors)`);
    await index.namespace(namespace).upsert(vectors);
  }
}

export async function queryVector(embedding: number[], topK = 3, namespace: Locale = "ko") {
  const index = getIndex();
  return index.namespace(namespace).query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
}
