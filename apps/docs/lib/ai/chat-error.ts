export type ChatErrorCause = "rate_limit" | "invalid_request" | "server_error" | "network_error";

export type ChatErrorPayload = {
  error: string;
  cause: Exclude<ChatErrorCause, "network_error">;
  retryAfterSeconds?: number;
};

export class ChatHttpError extends Error {
  readonly status: number | null;
  readonly causeCode: ChatErrorCause;
  readonly retryAfterSeconds?: number;

  constructor({ message, status, causeCode, retryAfterSeconds }: { message: string; status: number | null; causeCode: ChatErrorCause; retryAfterSeconds?: number }) {
    super(message);
    this.name = "ChatHttpError";
    this.status = status;
    this.causeCode = causeCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isChatErrorCause(value: unknown): value is ChatErrorPayload["cause"] {
  return value === "rate_limit" || value === "invalid_request" || value === "server_error";
}

function fallbackCause(status: number): ChatErrorPayload["cause"] {
  if (status === 429) return "rate_limit";
  return status >= 500 ? "server_error" : "invalid_request";
}

function parseRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - now) / 1000));
}

async function readErrorPayload(response: Response): Promise<{ message: string; causeCode: ChatErrorPayload["cause"]; retryAfterSeconds?: number }> {
  const body = await response.text();
  let payload: Partial<ChatErrorPayload> = {};

  try {
    payload = JSON.parse(body) as Partial<ChatErrorPayload>;
  } catch {
    payload = {};
  }

  const retryAfterSeconds = typeof payload.retryAfterSeconds === "number" ? payload.retryAfterSeconds : parseRetryAfter(response.headers.get("Retry-After"));

  return {
    message: typeof payload.error === "string" ? payload.error : body || `Chat request failed with status ${response.status}`,
    causeCode: isChatErrorCause(payload.cause) ? payload.cause : fallbackCause(response.status),
    retryAfterSeconds,
  };
}

export function createChatFetch(fetchImplementation: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input, init) => {
    let response: Response;

    try {
      response = await fetchImplementation(input, init);
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ChatHttpError({
        message: error instanceof Error ? error.message : "The chat request could not reach the server.",
        status: null,
        causeCode: "network_error",
      });
    }

    if (response.ok) return response;
    const payload = await readErrorPayload(response);
    throw new ChatHttpError({ status: response.status, ...payload });
  };
}

export function projectChatError(error: unknown) {
  if (error instanceof ChatHttpError && error.causeCode === "rate_limit") {
    return { state: "rate-limit" as const, retryAfterSeconds: error.retryAfterSeconds };
  }

  return { state: "error" as const, retryAfterSeconds: undefined };
}
