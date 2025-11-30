import { embed } from "ai";
import { embeddingModel } from "./openai";
import { getCachedEmbedding, setCachedEmbedding } from "../cache/embedding-cache";

export async function getEmbedding(text: string): Promise<number[]> {
  const cached = await getCachedEmbedding(text);
  if (cached) {
    return cached;
  }

  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });

  await setCachedEmbedding(text, embedding);

  return embedding;
}
