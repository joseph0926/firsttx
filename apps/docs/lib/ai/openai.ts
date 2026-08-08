import { createOpenAI } from "@ai-sdk/openai";
import { EMBEDDING_MODEL_ID } from "./index-contract";

export const CHAT_MODEL_ID = "gpt-5.6-luna";

export const CHAT_GENERATION_SETTINGS: { temperature?: number } = {};

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const chatModel = openai(CHAT_MODEL_ID);
export const embeddingModel = openai.embedding(EMBEDDING_MODEL_ID);
