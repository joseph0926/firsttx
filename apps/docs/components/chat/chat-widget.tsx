"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatPanel } from "./chat-panel";
import { cn } from "@/lib/utils";

const ENABLE_CHAT = process.env.NEXT_PUBLIC_ENABLE_CHAT === "true";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  if (!ENABLE_CHAT) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed right-4 bottom-20 z-50 flex h-[600px] max-h-[80vh] w-[400px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">FirstTx Assistant</span>
              <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">Beta</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-md p-1 transition-colors hover:bg-muted" aria-label="Close chat">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ChatPanel />
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className={cn("fixed right-4 bottom-4 z-50 rounded-full p-4 shadow-lg transition-all", "bg-primary text-primary-foreground hover:bg-primary/90", isOpen && "bg-muted text-muted-foreground")} aria-label={isOpen ? "Close chat" : "Open chat"}>
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
