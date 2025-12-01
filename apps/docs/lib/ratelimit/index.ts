import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "../cache/redis";

let perMinuteLimit: Ratelimit | null = null;
let perDayLimit: Ratelimit | null = null;
let globalDayLimit: Ratelimit | null = null;

function getPerMinuteLimit(): Ratelimit {
  if (perMinuteLimit) return perMinuteLimit;

  perMinuteLimit = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "chat:minute",
    analytics: true,
  });

  return perMinuteLimit;
}

function getPerDayLimit(): Ratelimit {
  if (perDayLimit) return perDayLimit;

  perDayLimit = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(50, "1 d"),
    prefix: "chat:day",
    analytics: true,
  });

  return perDayLimit;
}

function getGlobalDayLimit(): Ratelimit {
  if (globalDayLimit) return globalDayLimit;

  globalDayLimit = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(1000, "1 d"),
    prefix: "chat:global",
    analytics: true,
  });

  return globalDayLimit;
}

export type RateLimitType = "minute" | "day" | "global";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limitType?: RateLimitType;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const [minuteResult, dayResult, globalResult] = await Promise.all([getPerMinuteLimit().limit(identifier), getPerDayLimit().limit(identifier), getGlobalDayLimit().limit("global")]);

  if (!minuteResult.success) {
    return {
      success: false,
      remaining: minuteResult.remaining,
      reset: minuteResult.reset,
      limitType: "minute",
    };
  }

  if (!dayResult.success) {
    return {
      success: false,
      remaining: dayResult.remaining,
      reset: dayResult.reset,
      limitType: "day",
    };
  }

  if (!globalResult.success) {
    return {
      success: false,
      remaining: globalResult.remaining,
      reset: globalResult.reset,
      limitType: "global",
    };
  }

  return {
    success: true,
    remaining: Math.min(minuteResult.remaining, dayResult.remaining),
    reset: Math.min(minuteResult.reset, dayResult.reset),
  };
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "anonymous";
}
