"use client";

import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

type CodeBlockProps = React.ComponentPropsWithoutRef<"pre">;

type CodeChildProps = {
  className?: string;
  children?: ReactNode;
};

function getCodeInfo(children: ReactNode): { code: string; language?: string } {
  if (typeof children === "string") {
    return { code: children.trimEnd(), language: undefined };
  }

  if (isCodeElement(children)) {
    const raw = children.props.children;
    const code = typeof raw === "string" ? raw.trimEnd() : "";
    const className = children.props.className ?? "";
    const match = className.match(/language-([a-z0-9]+)/i);
    const language = match?.[1];
    return { code, language };
  }

  if (Array.isArray(children)) {
    const code = children
      .map((child) => {
        if (typeof child === "string") return child;
        if (isCodeElement(child)) {
          const raw = child.props.children;
          return typeof raw === "string" ? raw : "";
        }
        return "";
      })
      .join("")
      .trimEnd();

    return { code, language: undefined };
  }

  return { code: "", language: undefined };
}

function isCodeElement(node: ReactNode): node is ReactElement<CodeChildProps, "code"> {
  return !!node && typeof node === "object" && "type" in node && (node as ReactElement).type === "code";
}

export function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const { code, language } = getCodeInfo(children);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (error) {
      console.error("Failed to copy code", error);
    }
  }

  return (
    <div className={cn("relative my-6 overflow-hidden rounded-2xl border border-border/60", "bg-card/80 backdrop-blur-xl", "shadow-[0_0_24px_rgba(34,42,53,0.12),0_18px_60px_rgba(15,23,42,0.35)]", "dark:shadow-[0_0_24px_rgba(15,23,42,0.8),0_18px_60px_rgba(0,0,0,0.85)]", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-red-400/80" />
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-300/80" />
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" />
          {language && <span className="ml-2 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase">{language}</span>}
        </div>
        <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground">
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className={cn("max-h-[520px] overflow-x-auto overflow-y-auto px-4 py-3", "font-mono text-[13px] leading-relaxed")} {...props}>
        {children}
      </pre>
    </div>
  );
}
