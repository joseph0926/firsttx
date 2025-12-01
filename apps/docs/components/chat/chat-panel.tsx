"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, MessageSquare, Zap, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "./chat-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Locale = "ko" | "en";

const EXAMPLE_QUESTIONS: Record<Locale, { icon: typeof Zap; text: string }[]> = {
  ko: [
    { icon: Zap, text: "Prepaint가 뭔가요?" },
    { icon: BookOpen, text: "useSyncedModel 사용법 알려주세요" },
    { icon: MessageSquare, text: "트랜잭션 롤백은 어떻게 동작하나요?" },
  ],
  en: [
    { icon: Zap, text: "What is Prepaint?" },
    { icon: BookOpen, text: "How do I use useSyncedModel?" },
    { icon: MessageSquare, text: "How does transaction rollback work?" },
  ],
};

const UI_TEXT = {
  ko: {
    title: "FirstTx에 대해 무엇이든 물어보세요!",
    subtitle: "문서 기반으로 답변해 드려요",
    exampleLabel: "예시 질문",
    placeholder: "FirstTx에 대해 질문하세요...",
    generating: "답변 생성 중...",
    error: "오류가 발생했습니다:",
  },
  en: {
    title: "Ask anything about FirstTx!",
    subtitle: "Answers based on documentation",
    exampleLabel: "Example questions",
    placeholder: "Ask about FirstTx...",
    generating: "Generating response...",
    error: "An error occurred:",
  },
};

interface ChatPanelProps {
  locale: Locale;
}

export function ChatPanel({ locale }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const text = UI_TEXT[locale];
  const examples = EXAMPLE_QUESTIONS[locale];

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { locale },
      }),
    [locale],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({ text: input });
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center py-8">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-chart-2/10">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{text.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{text.subtitle}</p>
              <div className="mt-6 w-full space-y-2">
                <p className="text-center text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">{text.exampleLabel}</p>
                {examples.map(({ icon: Icon, text: questionText }, i) => (
                  <motion.button key={questionText} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} onClick={() => setInput(questionText)} className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left text-sm transition-all hover:border-primary/30 hover:bg-primary/5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm transition-colors group-hover:bg-primary/10">
                      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <span className="text-foreground/80 transition-colors group-hover:text-foreground">{questionText}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {messages.map((message, index) => (
                <ChatMessage key={message.id} message={message} isLatest={index === messages.length - 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="size-2 rounded-full bg-primary/60" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{text.generating}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {text.error} {error.message}
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-border/50 bg-muted/30 p-4">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={text.placeholder} className={cn("flex-1 rounded-xl px-4 py-2.5 text-sm", "border border-border/50 bg-background", "focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none", "placeholder:text-muted-foreground/60", "transition-all")} disabled={isLoading} />
          <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="size-10 shrink-0 rounded-xl">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </>
  );
}
