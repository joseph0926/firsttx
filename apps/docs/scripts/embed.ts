const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embed(text: string, retries = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text",
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`  Retry ${attempt}/${retries}...`);
      await sleep(1000 * attempt);
    }
  }
  throw new Error("Embedding failed after retries");
}
