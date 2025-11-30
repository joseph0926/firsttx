import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai/ollama";
import { retrieveContext, buildSystemPrompt } from "@/lib/ai/rag";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  if (!messages || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

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
    const { contextText } = await retrieveContext(userQuery);

    const systemPrompt = buildSystemPrompt(contextText);

    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("RAG error:", err);
    return new Response("Internal RAG error", { status: 500 });
  }
}
