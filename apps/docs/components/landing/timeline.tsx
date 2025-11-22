"use client";

import { Activity } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

export function Timeline() {
  const t = useTranslations("Timeline");
  const rows = t.raw("rows") as Array<{
    label: string;
    badge: string;
    status: "success" | "pending" | "error";
    detail: string;
  }>;
  const statusLabels = t.raw("status") as Record<"success" | "pending" | "error", string>;

  return (
    <motion.div className="relative rounded-2xl border border-border/70 bg-card/85 p-4 shadow-[0_24px_80px_-44px_rgba(15,23,42,1)] backdrop-blur-xl sm:p-5" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-primary/12 via-transparent to-transparent" />
      <div className="relative mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Activity className="size-3" />
          <span className="font-medium text-foreground/80">{t("title")}</span>
        </span>
        <span className="rounded-full border border-border/60 bg-secondary/80 px-2.5 py-1 text-[10px]">{t("legend")}</span>
      </div>
      <div className="relative mt-1 space-y-2 text-[11px]">
        <div className="pointer-events-none absolute top-1 bottom-1 left-3 hidden w-px bg-border/80 sm:block" />
        {rows.map((row) => (
          <TimelineRow key={`${row.label}-${row.detail}`} label={row.label} badge={row.badge} status={row.status} statusLabel={statusLabels[row.status]} detail={row.detail} />
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">{t("footnote")}</p>
    </motion.div>
  );
}

function TimelineRow({ label, badge, status, statusLabel, detail }: { label: string; badge: string; status: "success" | "pending" | "error"; statusLabel: string; detail: string }) {
  const statusDot = status === "success" ? "bg-emerald-400" : status === "pending" ? "bg-amber-400" : "bg-destructive";
  const statusText = status === "success" ? "text-emerald-500" : status === "pending" ? "text-amber-500" : "text-destructive";

  return (
    <div className="relative rounded-lg border border-border/60 bg-background/80 px-3 py-2 pl-5">
      <span className={`absolute top-2.5 left-2 size-1.5 rounded-full ${statusDot}`} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-foreground/90">{label}</span>
          <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground">{badge}</span>
        </div>
        <span className={`text-[10px] font-medium ${statusText}`}>{statusLabel}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
