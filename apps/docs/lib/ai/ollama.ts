import { createOllama } from "ollama-ai-provider-v2";

const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export const ollama = createOllama({
  baseURL: `${baseURL}/api`,
});

export const chatModel = ollama("llama3.2:3b");
export const embeddingModel = ollama.textEmbeddingModel("nomic-embed-text");
