import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embed(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: trimmed,
  });

  return response.data[0].embedding;
}
