"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2 } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
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
        {messages.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">FirstTx에 대해 무엇이든 물어보세요!</p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="text-muted-foreground/70">예시 질문:</p>
              <button onClick={() => setInput("Prepaint가 뭔가요?")} className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-muted">
                &quot;Prepaint가 뭔가요?&quot;
              </button>
              <button onClick={() => setInput("useSyncedModel 사용법 알려주세요")} className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-muted">
                &quot;useSyncedModel 사용법 알려주세요&quot;
              </button>
              <button onClick={() => setInput("트랜잭션 롤백은 어떻게 동작하나요?")} className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-muted">
                &quot;트랜잭션 롤백은 어떻게 동작하나요?&quot;
              </button>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">답변 생성 중...</span>
          </div>
        )}
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">오류가 발생했습니다: {error.message}</div>}

        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="FirstTx에 대해 질문하세요..." className={cn("flex-1 rounded-md px-3 py-2 text-sm", "border border-border bg-muted/50", "focus:ring-2 focus:ring-primary/50 focus:outline-none", "placeholder:text-muted-foreground")} disabled={isLoading} />
          <button type="submit" disabled={!input.trim() || isLoading} className={cn("rounded-md px-3 py-2 transition-colors", "bg-primary text-primary-foreground", "hover:bg-primary/90", "disabled:cursor-not-allowed disabled:opacity-50")}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </>
  );
}
