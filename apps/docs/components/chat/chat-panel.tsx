"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, CornerDownRight, LoaderCircle } from "lucide-react";
import { createChatFetch, projectChatError } from "@/lib/ai/chat-error";
import { ChatMessage } from "./chat-message";

type Locale = "ko" | "en";
export type ChatFixtureState = "empty" | "streaming" | "unknown" | "error" | "rate-limit";

const copy = {
  ko: {
    empty: "궁금한 계약이나 오류를 입력하세요.",
    exampleLabel: "예시 질문",
    examples: ["Prepaint 복원 경계는 무엇인가요?", "Local-First는 충돌을 해결하나요?", "Tx 보상은 언제 실행되나요?"],
    streaming: "관련 문서와 공개 API를 확인하고 있습니다…",
    unknown: "현재 문서만으로는 확인할 수 없습니다. 관련 제한 사항을 확인하세요.",
    error: "답변을 불러오지 못했습니다. 문서는 계속 읽을 수 있습니다.",
    rateLimit: "요청 한도에 도달했습니다. 잠시 뒤 다시 시도하거나 문서에서 직접 찾으세요.",
    retryAfter: (seconds: number) => `${seconds}초 후 다시 시도할 수 있습니다.`,
    retry: "다시 시도",
    browse: "관련 문서 보기",
    send: "질문 보내기",
  },
  en: {
    empty: "Ask about a contract, error, or limitation.",
    exampleLabel: "Example questions",
    examples: ["What is the Prepaint restore boundary?", "Does Local-First resolve conflicts?", "When does Tx compensation run?"],
    streaming: "Checking the current docs and public API…",
    unknown: "The current docs cannot establish this. Continue to the related limitations.",
    error: "The answer could not be loaded. You can keep reading the docs.",
    rateLimit: "The request limit was reached. Try later or browse the docs directly.",
    retryAfter: (seconds: number) => `You can retry in ${seconds} seconds.`,
    retry: "Retry",
    browse: "Browse related docs",
    send: "Send question",
  },
} as const;

export function ChatPanel({ locale, fixtureState }: { locale: Locale; fixtureState?: ChatFixtureState }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const text = copy[locale];
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", body: { locale }, fetch: createChatFetch() }), [locale]);
  const { messages, sendMessage, status, error, regenerate } = useChat({ transport });
  const isLoading = status === "streaming" || status === "submitted";
  const projectedError = error ? projectChatError(error) : undefined;
  const state = fixtureState ?? projectedError?.state ?? (isLoading && messages.length === 0 ? "streaming" : undefined);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || isLoading || fixtureState) return;
    sendMessage({ text: input });
    setInput("");
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="docs-chat-body">
      <div className="docs-chat-scroll" aria-live="polite" aria-busy={state === "streaming" || isLoading}>
        {state && state !== "empty" ? (
          <ChatState locale={locale} state={state} retryAfterSeconds={projectedError?.retryAfterSeconds} onRetry={fixtureState ? undefined : () => void regenerate()} />
        ) : messages.length === 0 ? (
          <div className="docs-chat-empty">
            <p>{text.empty}</p>
            <span>{text.exampleLabel}</span>
            <div>
              {text.examples.map((example) => (
                <button key={example} type="button" onClick={() => setInput(example)} disabled={Boolean(fixtureState)}>
                  <CornerDownRight aria-hidden="true" />
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="docs-chat-messages">
            {messages.map((message, index) => (
              <ChatMessage key={message.id} message={message} isLatest={index === messages.length - 1} />
            ))}
            {isLoading ? <ChatState locale={locale} state="streaming" onRetry={() => undefined} /> : null}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="docs-chat-form">
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={text.empty} disabled={isLoading || Boolean(fixtureState && fixtureState !== "empty")} aria-label={text.empty} />
        <button type="submit" disabled={!input.trim() || isLoading || Boolean(fixtureState)} aria-label={text.send}>
          {isLoading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}

function ChatState({ locale, state, retryAfterSeconds, onRetry }: { locale: Locale; state: Exclude<ChatFixtureState, "empty">; retryAfterSeconds?: number; onRetry?: () => void }) {
  const text = copy[locale];
  const message = text[state === "rate-limit" ? "rateLimit" : state];

  return (
    <div className={`docs-chat-state is-${state}`} role={state === "error" || state === "rate-limit" ? "alert" : "status"}>
      <span aria-hidden="true">{state === "streaming" ? "···" : "↳"}</span>
      <p>
        {message}
        {state === "rate-limit" && retryAfterSeconds !== undefined ? ` ${text.retryAfter(retryAfterSeconds)}` : ""}
      </p>
      {(state === "error" || state === "rate-limit") && onRetry ? (
        <button type="button" onClick={onRetry}>
          {text.retry}
        </button>
      ) : null}
      {state === "unknown" || state === "rate-limit" ? <Link href={`/${locale}/docs/troubleshooting`}>{text.browse}</Link> : null}
    </div>
  );
}
