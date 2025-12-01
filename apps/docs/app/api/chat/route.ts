import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai/openai";
import { retrieveContext, buildSystemPrompt, type Locale } from "@/lib/ai/rag";
import { checkRateLimit, getClientIP, type RateLimitType } from "@/lib/ratelimit";

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

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const { success, remaining, reset, limitType } = await checkRateLimit(ip);

  if (!success && limitType) {
    const body = await req
      .clone()
      .json()
      .catch(() => ({}));
    const locale: Locale = isValidLocale(body.locale) ? body.locale : "ko";

    return new Response(JSON.stringify({ error: RATE_LIMIT_MESSAGES[limitType][locale] }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    });
  }

  const { messages, locale: rawLocale }: { messages: UIMessage[]; locale?: string } = await req.json();

  if (!messages || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : "ko";

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const userQuery =
    lastUserMessage.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ") || "";
  if (!userQuery) {
    return new Response("No query provided", { status: 400 });
  }

  try {
    const { contextText } = await retrieveContext(userQuery, 8, locale);

    const systemPrompt = buildSystemPrompt(contextText, locale);

    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      temperature: 0.1,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("RAG error:", err);
    return new Response("Internal RAG error", { status: 500 });
  }
}
