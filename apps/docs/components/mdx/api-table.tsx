import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ApiKind = "props" | "options" | "params" | "returns";

interface ApiItem {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description: ReactNode;
}

interface ApiTableProps {
  title?: string;
  kind?: ApiKind;
  items: ApiItem[];
  className?: string;
}

export function ApiTable({ title, kind = "props", items, className }: ApiTableProps) {
  return (
    <section className={cn("my-8", className)}>
      {title && <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">{title}</h3>}
      <div className={cn("overflow-hidden rounded-2xl border border-border/70", "bg-card/80 backdrop-blur-xl", "shadow-xl")}>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2">
          <div className="text-[11px] tracking-[0.14em] text-muted-foreground/90 uppercase">{labelForKind(kind)}</div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span>required</span>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            <span>optional</span>
          </div>
        </div>
        <div className="max-h-[520px] overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs md:text-sm">
            <thead className="bg-muted/60 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              <tr>
                <th className="min-w-[120px] border-b border-border/70 px-4 py-2">Name</th>
                <th className="min-w-40 border-b border-border/70 px-4 py-2">Type</th>
                <th className="min-w-[100px] border-b border-border/70 px-4 py-2">Default</th>
                <th className="border-b border-border/70 px-4 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name} className="border-t border-border/50 align-top last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-foreground">{item.name}</span>
                      <span className={cn("inline-flex h-1.5 w-1.5 rounded-full", item.required ? "bg-emerald-400/90 shadow-[0_0_10px_rgba(16,185,129,0.9)]" : "bg-muted-foreground/40")} />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <code className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{item.type}</code>
                  </td>
                  <td className="px-4 py-3 align-top">{item.defaultValue ? <code className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{item.defaultValue}</code> : <span className="text-[11px] text-muted-foreground/60">-</span>}</td>
                  <td className="px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function labelForKind(kind: ApiKind): string {
  switch (kind) {
    case "props":
      return "Component props";
    case "options":
      return "Options";
    case "params":
      return "Parameters";
    case "returns":
      return "Return value";
    default:
      return "API";
  }
}
