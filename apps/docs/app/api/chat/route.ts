import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai/openai";
import { retrieveContext, buildSystemPrompt, type Locale } from "@/lib/ai/rag";

export const maxDuration = 60;

function isValidLocale(locale: unknown): locale is Locale {
  return locale === "ko" || locale === "en";
}

export async function POST(req: Request) {
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
