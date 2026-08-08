import OpenAI from "openai";
import { EMBEDDING_MODEL_ID } from "../lib/ai/index-contract";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiInstance) return openaiInstance;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  openaiInstance = new OpenAI({ apiKey });
  return openaiInstance;
}

export async function embed(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL_ID,
    input: trimmed,
  });

  return response.data[0].embedding;
}
