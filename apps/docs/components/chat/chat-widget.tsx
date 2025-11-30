"use client";

import { useState } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatPanel } from "./chat-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ENABLE_CHAT = process.env.NEXT_PUBLIC_ENABLE_CHAT === "true";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  if (!ENABLE_CHAT) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="fixed right-4 bottom-20 z-50 flex h-[600px] max-h-[80vh] w-[400px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/50 bg-linear-to-r from-primary/5 via-transparent to-chart-2/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-primary to-chart-2 shadow-lg shadow-primary/25">
                  <Sparkles className="size-3.5 text-white" />
                </div>
                <span className="font-semibold tracking-tight">FirstTx Assistant</span>
                <Badge variant="secondary" className="bg-amber-500/15 text-[10px] text-amber-600 dark:text-amber-400">
                  Beta
                </Badge>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsOpen(false)} aria-label="Close chat" className="size-7 rounded-full">
                <X className="size-4" />
              </Button>
            </div>
            <ChatPanel />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div initial={false} animate={{ scale: isOpen ? 0.9 : 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="fixed right-6 bottom-6 z-50">
        <Button onClick={() => setIsOpen(!isOpen)} size="icon-lg" className={cn("size-12 rounded-full shadow-lg transition-all", isOpen ? "bg-muted text-muted-foreground shadow-md" : "bg-linear-to-br from-primary to-chart-2 text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40")} aria-label={isOpen ? "Close chat" : "Open chat"}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={isOpen ? "close" : "open"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              {isOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
            </motion.div>
          </AnimatePresence>
        </Button>
      </motion.div>
    </>
  );
}
