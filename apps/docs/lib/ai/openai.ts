import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const chatModel = openai("gpt-4o-mini");
export const embeddingModel = openai.embedding("text-embedding-3-small");
