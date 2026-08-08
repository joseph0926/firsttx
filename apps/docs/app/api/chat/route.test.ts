import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatErrorPayload } from "@/lib/ai/chat-error";

const checkRateLimit = vi.fn();
const retrieveContext = vi.fn();

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (identifier: string) => checkRateLimit(identifier),
  getClientIP: () => "203.0.113.1",
}));

vi.mock("@/lib/ai/rag", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/rag")>();
  return { ...actual, retrieveContext: (...args: unknown[]) => retrieveContext(...args) };
});

const { POST } = await import("./route");

function chatRequest(body: unknown): Request {
  return new Request("https://firsttx.store/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { locale: "ko", messages: [{ role: "user", parts: [{ type: "text", text: "질문" }] }] };

describe("POST /api/chat rate limit availability", () => {
  beforeEach(() => {
    checkRateLimit.mockReset();
    retrieveContext.mockReset();
  });

  it("fails closed with a typed 503 when the rate limiter is unavailable", async () => {
    checkRateLimit.mockRejectedValue(new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required"));

    const response = await POST(chatRequest(validBody));
    const payload = (await response.json()) as ChatErrorPayload;

    expect(response.status).toBe(503);
    expect(payload.cause).toBe("server_error");
    expect(retrieveContext).not.toHaveBeenCalled();
  });

  it("does not spend a generation call when the limiter is down", async () => {
    checkRateLimit.mockRejectedValue(new Error("connection refused"));

    await POST(chatRequest(validBody));

    expect(retrieveContext).not.toHaveBeenCalled();
  });

  it("still returns the 429 contract when the limiter reports a breach", async () => {
    checkRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 30_000, limitType: "minute" });

    const response = await POST(chatRequest(validBody));
    const payload = (await response.json()) as ChatErrorPayload;

    expect(response.status).toBe(429);
    expect(payload.cause).toBe("rate_limit");
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(retrieveContext).not.toHaveBeenCalled();
  });

  it("rejects an empty message list without reaching retrieval", async () => {
    checkRateLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60_000 });

    const response = await POST(chatRequest({ locale: "ko", messages: [] }));
    const payload = (await response.json()) as ChatErrorPayload;

    expect(response.status).toBe(400);
    expect(payload.cause).toBe("invalid_request");
    expect(retrieveContext).not.toHaveBeenCalled();
  });
});
