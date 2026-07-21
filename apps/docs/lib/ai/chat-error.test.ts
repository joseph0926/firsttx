import { describe, expect, it, vi } from "vitest";
import { ChatHttpError, createChatFetch, projectChatError } from "./chat-error";

describe("createChatFetch", () => {
  it("passes successful responses through without consuming the body", async () => {
    const response = new Response("stream", { status: 200 });
    const fetcher = createChatFetch(vi.fn(async () => response) as typeof fetch);

    const result = await fetcher("/api/chat");

    expect(result).toBe(response);
    expect(await result.text()).toBe("stream");
  });

  it("preserves 429 status, cause, and retry metadata", async () => {
    const response = Response.json(
      {
        error: "Too many requests",
        cause: "rate_limit",
        retryAfterSeconds: 45,
      },
      { status: 429, headers: { "Retry-After": "45" } },
    );
    const fetcher = createChatFetch(vi.fn(async () => response) as typeof fetch);

    const error = await fetcher("/api/chat").catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ChatHttpError);
    expect(error).toMatchObject({ status: 429, causeCode: "rate_limit", retryAfterSeconds: 45 });
    expect(projectChatError(error)).toEqual({ state: "rate-limit", retryAfterSeconds: 45 });
  });

  it("classifies non-JSON server failures without message matching", async () => {
    const response = new Response("Internal RAG error", { status: 500 });
    const fetcher = createChatFetch(vi.fn(async () => response) as typeof fetch);

    const error = await fetcher("/api/chat").catch((reason: unknown) => reason);

    expect(error).toMatchObject({ status: 500, causeCode: "server_error" });
    expect(projectChatError(error)).toEqual({ state: "error", retryAfterSeconds: undefined });
  });

  it("wraps network failures and preserves abort failures", async () => {
    const networkFetcher = createChatFetch(vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as typeof fetch);
    const networkError = await networkFetcher("/api/chat").catch((reason: unknown) => reason);
    expect(networkError).toMatchObject({ status: null, causeCode: "network_error" });

    const abort = new DOMException("Aborted", "AbortError");
    const abortFetcher = createChatFetch(vi.fn(async () => Promise.reject(abort)) as typeof fetch);
    await expect(abortFetcher("/api/chat")).rejects.toBe(abort);
  });
});
