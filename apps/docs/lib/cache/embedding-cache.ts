import { getRedis } from "./redis";

const CACHE_PREFIX = "emb:";
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

function hashKey(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${CACHE_PREFIX}${hash.toString(16)}`;
}

export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  try {
    const redis = getRedis();
    const key = hashKey(text);
    const cached = await redis.get<number[]>(key);
    return cached;
  } catch (error) {
    console.warn("[EmbeddingCache] Get error:", error);
    return null;
  }
}

export async function setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
  try {
    const redis = getRedis();
    const key = hashKey(text);
    await redis.set(key, embedding, { ex: CACHE_TTL_SECONDS });
  } catch (error) {
    console.warn("[EmbeddingCache] Set error:", error);
  }
}
