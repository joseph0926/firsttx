import { embed } from "ai";
import { embeddingModel } from "./ollama";

export async function getEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });

  return embedding;
}
