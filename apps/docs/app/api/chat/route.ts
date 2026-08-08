import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { CHAT_GENERATION_SETTINGS, chatModel } from "@/lib/ai/openai";
import { retrieveContext, buildSystemPrompt, RETRIEVAL_TOP_K, type Locale } from "@/lib/ai/rag";
import { checkRateLimit, getClientIP, type RateLimitType } from "@/lib/ratelimit";
import type { ChatErrorCause, ChatErrorPayload } from "@/lib/ai/chat-error";

export const maxDuration = 60;

const RATE_LIMIT_MESSAGES: Record<RateLimitType, Record<Locale, string>> = {
  minute: {
    ko: "요청이 너무 빠릅니다. 1분 후 다시 시도해주세요. (분당 10회 제한)",
    en: "Too many requests. Please try again in a minute. (10 requests per minute)",
  },
  day: {
    ko: "오늘 사용량을 모두 소진했습니다. 내일 다시 이용해주세요. (일 50회 제한)",
    en: "Daily limit reached. Please try again tomorrow. (50 requests per day)",
  },
  global: {
    ko: "베타 서비스 일일 총량이 소진되었습니다. 내일 다시 이용해주세요.",
    en: "Beta service daily quota exhausted. Please try again tomorrow.",
  },
};

function isValidLocale(locale: unknown): locale is Locale {
  return locale === "ko" || locale === "en";
}

function errorResponse(status: number, cause: Exclude<ChatErrorCause, "network_error">, error: string, retryAfterSeconds?: number) {
  const payload: ChatErrorPayload = { error, cause, retryAfterSeconds };
  const headers = retryAfterSeconds === undefined ? undefined : { "Retry-After": retryAfterSeconds.toString() };
  return Response.json(payload, { status, headers });
}

export async function POST(req: Request) {
  const ip = getClientIP(req);

  let rateLimit: Awaited<ReturnType<typeof checkRateLimit>>;
  try {
    rateLimit = await checkRateLimit(ip);
  } catch (err) {
    console.error("Rate limit unavailable:", err);
    return errorResponse(503, "server_error", "Chat is temporarily unavailable");
  }

  const { success, remaining, reset, limitType } = rateLimit;

  if (!success && limitType) {
    const body = await req
      .clone()
      .json()
      .catch(() => ({}));
    const locale: Locale = isValidLocale(body.locale) ? body.locale : "ko";
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    return Response.json(
      {
        error: RATE_LIMIT_MESSAGES[limitType][locale],
        cause: "rate_limit",
        retryAfterSeconds,
      } satisfies ChatErrorPayload,
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": retryAfterSeconds.toString(),
        },
      },
    );
  }

  const { messages, locale: rawLocale }: { messages: UIMessage[]; locale?: string } = await req.json();

  if (!messages || messages.length === 0) {
    return errorResponse(400, "invalid_request", "No messages provided");
  }

  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : "ko";

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return errorResponse(400, "invalid_request", "No user message found");
  }

  const userQuery =
    lastUserMessage.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ") || "";
  if (!userQuery) {
    return errorResponse(400, "invalid_request", "No query provided");
  }

  try {
    const { contextText } = await retrieveContext(userQuery, RETRIEVAL_TOP_K, locale);

    const systemPrompt = buildSystemPrompt(contextText, locale);

    const result = streamText({
      model: chatModel,
      ...CHAT_GENERATION_SETTINGS,
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("RAG error:", err);
    return errorResponse(500, "server_error", "Internal RAG error");
  }
}
