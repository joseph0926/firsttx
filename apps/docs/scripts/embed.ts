function getOllamaBaseUrl() {
  return process.env.OLLAMA_BASE_URL || "http://localhost:11434";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embed(text: string, retries = 3): Promise<number[]> {
  const baseUrl = getOllamaBaseUrl();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text",
          prompt: text,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText} - ${body}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.embedding)) {
        throw new Error("Invalid embedding response from Ollama");
      }
      return data.embedding;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`  Retry ${attempt}/${retries} after error:`, (error as Error).message);
      await sleep(1000 * attempt);
    }
  }
  throw new Error("Embedding failed after retries");
}
