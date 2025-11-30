"use client";

import type { UIMessage } from "ai";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const content = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>

      <div className={cn("flex-1 rounded-lg px-4 py-3 text-sm", isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
        <div className="wrap-break-word whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
