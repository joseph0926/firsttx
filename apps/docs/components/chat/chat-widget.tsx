"use client";

import { useEffect, useState } from "react";
import { MessageCircleQuestion, X } from "lucide-react";
import { ChatPanel, type ChatFixtureState } from "./chat-panel";

type Locale = "ko" | "en";

const ENABLE_CHAT = process.env.NEXT_PUBLIC_ENABLE_CHAT === "true";
const fixtureStates: ChatFixtureState[] = ["empty", "streaming", "unknown", "error", "rate-limit"];

const copy = {
  ko: {
    assistant: "문서 도우미",
    hint: "현재 문서에서 근거를 찾아 안내합니다.",
    open: "문서 도우미 열기",
    close: "문서 도우미 닫기",
  },
  en: {
    assistant: "Docs assistant",
    hint: "Finds grounded answers in the current docs.",
    open: "Open docs assistant",
    close: "Close docs assistant",
  },
} as const;

export function ChatWidget({ locale }: { locale: Locale }) {
  const [fixtureState, setFixtureState] = useState<ChatFixtureState>();
  const [isOpen, setIsOpen] = useState(false);
  const text = copy[locale];

  useEffect(() => {
    if (!ENABLE_CHAT || !["localhost", "127.0.0.1"].includes(window.location.hostname)) return;
    const value = new URLSearchParams(window.location.search).get("chat-fixture") as ChatFixtureState | null;
    if (value && fixtureStates.includes(value)) {
      const timer = window.setTimeout(() => {
        setFixtureState(value);
        setIsOpen(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  if (!ENABLE_CHAT && !fixtureState) return null;

  return (
    <>
      {isOpen ? (
        <aside className="docs-chat" aria-label={text.assistant}>
          <header>
            <div>
              <strong>{text.assistant}</strong>
              <span>{text.hint}</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label={text.close}>
              <X aria-hidden="true" />
            </button>
          </header>
          <ChatPanel locale={locale} fixtureState={fixtureState} />
        </aside>
      ) : null}
      {!isOpen ? (
        <button type="button" className="docs-chat-trigger" onClick={() => setIsOpen(true)} aria-label={text.open}>
          <MessageCircleQuestion aria-hidden="true" />
          <span>{text.assistant}</span>
        </button>
      ) : null}
    </>
  );
}
