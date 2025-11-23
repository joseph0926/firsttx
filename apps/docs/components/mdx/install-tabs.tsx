"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

const MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const;
type Manager = (typeof MANAGERS)[number];

interface InstallTabsProps {
  packages: string[];
  dev?: boolean;
  title?: string;
  className?: string;
}

function buildCommand(manager: Manager, packages: string[], dev?: boolean) {
  const pkgs = packages.join(" ");
  switch (manager) {
    case "pnpm":
      return dev ? `pnpm add -D ${pkgs}` : `pnpm add ${pkgs}`;
    case "npm":
      return dev ? `npm install -D ${pkgs}` : `npm install ${pkgs}`;
    case "yarn":
      return dev ? `yarn add -D ${pkgs}` : `yarn add ${pkgs}`;
    case "bun":
      return dev ? `bun add -d ${pkgs}` : `bun add ${pkgs}`;
    default:
      return pkgs;
  }
}

export function InstallTabs({ packages, dev, title, className }: InstallTabsProps) {
  const [manager, setManager] = useState<Manager>("pnpm");
  const [copied, setCopied] = useState(false);

  const commands = useMemo(
    () =>
      MANAGERS.reduce(
        (acc, m) => {
          acc[m] = buildCommand(m, packages, dev);
          return acc;
        },
        {} as Record<Manager, string>,
      ),
    [packages, dev],
  );

  const activeCommand = commands[manager];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Failed to copy install command", err);
    }
  };

  return (
    <div className={cn("my-5", className)}>
      <Tabs
        value={manager}
        onValueChange={(val) => {
          setManager(val as Manager);
          setCopied(false);
        }}
      >
        <div className={cn("flex flex-col gap-3 rounded-2xl border border-border/60", "bg-card/80 p-2 backdrop-blur-xl", "shadow-md")}>
          <div className="flex items-center justify-between gap-2">
            <TabsList className="inline-flex rounded-full bg-muted/60 p-0.5 text-[11px]">
              {MANAGERS.map((m) => (
                <TabsTrigger key={m} value={m} className={cn("rounded-full border border-transparent px-3 py-1.5", "data-[state=active]:border-border/60 data-[state=active]:bg-background", "data-[state=active]:shadow-2xl", "capitalize")}>
                  {m}
                </TabsTrigger>
              ))}
            </TabsList>
            <button type="button" onClick={handleCopy} className={cn("inline-flex items-center gap-1 rounded-full border border-border/60", "bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground", "cursor-pointer shadow-2xl backdrop-blur-xl")}>
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
          {title && <div className="px-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{title}</div>}
          {MANAGERS.map((m) => (
            <TabsContent key={m} value={m} className="mt-0">
              <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2 font-mono text-[12px] text-foreground/90">
                <span className="select-all">{commands[m]}</span>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
