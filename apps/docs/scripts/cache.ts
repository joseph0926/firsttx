import { Redis } from "@upstash/redis";

const CACHE_PREFIX = "emb:";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }

  return new Redis({ url, token });
}

export async function clearEmbeddingCache(): Promise<number> {
  const redis = getRedis();

  let cursor = 0;
  let totalDeleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: `${CACHE_PREFIX}*`,
      count: 100,
    });

    cursor = Number(nextCursor);

    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== 0);

  return totalDeleted;
}
