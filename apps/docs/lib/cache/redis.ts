import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }

  redisInstance = new Redis({ url, token });
  return redisInstance;
}
