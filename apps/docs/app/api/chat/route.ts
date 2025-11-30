import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai/ollama";
import { retrieveContext, buildSystemPrompt } from "@/lib/ai/rag";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const userQuery =
    lastMessage.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ") || "";

  if (!userQuery) {
    return new Response("No query provided", { status: 400 });
  }

  const { contextText } = await retrieveContext(userQuery);
  const systemPrompt = buildSystemPrompt(contextText);

  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
