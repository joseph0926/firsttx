import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type CalloutType = "info" | "success" | "warning" | "danger";

const variantStyles: Record<CalloutType, { icon: React.ComponentType<{ className?: string }>; ring: string; iconColor: string }> = {
  info: {
    icon: Info,
    ring: "ring-1 ring-sky-500/20",
    iconColor: "text-sky-500",
  },
  success: {
    icon: CheckCircle2,
    ring: "ring-1 ring-emerald-500/20",
    iconColor: "text-emerald-500",
  },
  warning: {
    icon: AlertTriangle,
    ring: "ring-1 ring-amber-500/25",
    iconColor: "text-amber-500",
  },
  danger: {
    icon: XCircle,
    ring: "ring-1 ring-rose-500/25",
    iconColor: "text-rose-500",
  },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Callout({ type = "info", title, children, className }: CalloutProps) {
  const variant = variantStyles[type];
  const Icon = variant.icon;

  return (
    <div className={cn("my-6 overflow-hidden rounded-2xl border border-border/80 px-4 py-3", "bg-linear-to-br from-background/80 via-background/60 to-muted/60", "shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.9)]", variant.ring, className)}>
      <div className="flex items-start gap-3 text-sm">
        <div className={cn("mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border/60", "bg-background/90", variant.iconColor)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="space-y-1">
          {title && <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">{title}</div>}
          <div className="text-[13px] leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}
