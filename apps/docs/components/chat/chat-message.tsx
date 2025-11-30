"use client";

import type { UIMessage } from "ai";
import { User, Sparkles } from "lucide-react";
import { motion } from "motion/react";
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
    <motion.div initial={isLatest ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full shadow-sm", isUser ? "bg-linear-to-br from-primary to-chart-2 text-white" : "bg-linear-to-br from-muted to-muted/80 text-muted-foreground")}>{isUser ? <User className="size-4" /> : <Sparkles className="size-4" />}</div>
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm", isUser ? "bg-linear-to-br from-primary to-primary/90 text-primary-foreground" : "border border-border/50 bg-background text-foreground")}>
        <div className="leading-relaxed wrap-break-word whitespace-pre-wrap">{content}</div>
      </div>
    </motion.div>
  );
}
