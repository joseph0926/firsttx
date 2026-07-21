"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: UIMessage;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest = false }: ChatMessageProps) {
  const isUser = message.role === "user";

  const content = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div data-latest={isLatest || undefined} className={cn("flex", isUser && "justify-end")}>
      <div className={cn("max-w-[88%] rounded-xl border border-border px-3.5 py-3 text-sm", isUser ? "bg-foreground text-background" : "bg-background text-foreground")}>
        <div className="leading-relaxed wrap-break-word whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
