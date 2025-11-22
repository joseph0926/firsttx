"use client";

import { useTranslations } from "next-intl";
import { highlights } from "@/constants/home";
import { Activity, Sparkles, Zap } from "lucide-react";

export function DemoCard() {
  const t = useTranslations("DemoCard");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl sm:p-5 dark:border-border/70 dark:bg-card/70">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-rose-400" />
          <span className="ml-2 font-medium text-foreground/80">{t("windowTitle")}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-1">
          <Activity className="size-3" />
          <span className="text-[10px] font-medium">{t("devtoolsLabel")}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-muted/60 p-3 text-xs">
          <p className="mb-2 font-semibold text-muted-foreground">{t("beforeTitle")}</p>
          <TimelineItem label={t("beforeUserRevisitLabel")} detail={t("beforeUserRevisitDetail")} />
          <TimelineItem label={t("beforeBlankLabel")} detail={t("beforeBlankDetail")} tone="danger" />
          <TimelineItem label={t("beforeMountLabel")} detail={t("beforeMountDetail")} />
        </div>
        <div className="rounded-xl border border-primary/40 bg-linear-to-br from-primary/20 via-primary/10 to-card p-3 text-xs text-foreground">
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-3 text-primary" />
            {t("afterTitle")}
          </p>
          <TimelineItem label={t("afterBootLabel")} detail={t("afterBootDetail")} tone="accent" />
          <TimelineItem label={t("afterRestoreLabel")} detail={t("afterRestoreDetail")} tone="accent" />
          <TimelineItem label={t("afterHydrationLabel")} detail={t("afterHydrationDetail")} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-1 flex-wrap items-center gap-1.5 text-muted-foreground/90">
          <Zap className="size-3 text-primary" />
          <span>{t("viewTransitions")}</span>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {highlights.map((item) => (
            <div key={item.label} className="flex min-w-24 flex-col rounded-lg border border-border/60 bg-background/90 px-2.5 py-1.5 text-left shadow-sm">
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
              <span className="text-xs font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, detail, tone = "neutral" }: { label: string; detail: string; tone?: "neutral" | "danger" | "accent" }) {
  const toneClass = tone === "danger" ? "bg-destructive/80" : tone === "accent" ? "bg-emerald-400" : "bg-foreground/40";

  return (
    <div className="mt-2 flex items-start gap-2">
      <span className={`mt-1 size-1.5 rounded-full ${toneClass}`} />
      <div>
        <p className="text-[11px] font-medium text-foreground/90">{label}</p>
        <p className="text-[11px] text-muted-foreground/90">{detail}</p>
      </div>
    </div>
  );
}
