"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { DemoCard } from "./demo-card";
import { Badge } from "../ui/badge";

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className="mt-10 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center">
      <div className="space-y-7 text-center lg:text-left">
        <motion.div className="inline-flex animate-in items-center gap-2 rounded-full border border-border/70 bg-primary-foreground/60 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm fade-in slide-in-from-top-4" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex size-4 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="size-2.5 text-primary" />
          </div>
          <span className="tracking-tight">{t("badge")}</span>
        </motion.div>
        <motion.h1 className="mx-auto max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl md:text-[2.5rem] lg:mx-0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.7 }}>
          <span className="bg-linear-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">{t("title")}</span>
          <span className="mt-3 block text-base font-normal text-muted-foreground sm:text-lg">{t("subtitle")}</span>
        </motion.h1>
        <motion.p className="mx-auto max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base lg:mx-0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }}>
          {t("bodyLine1")} <br className="hidden sm:inline" />
          {t("bodyLine2")}
        </motion.p>
        <motion.div className="flex flex-wrap items-center justify-center gap-3 pt-1 lg:justify-start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5 }}>
          <a href="#quickstart" className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-xl">
            {t("ctaInstall")}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </a>
          <a href="https://firsttx-playground.vercel.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-4 py-2 text-xs font-medium text-foreground/80 backdrop-blur transition hover:bg-secondary/70">
            {t("ctaPlayground")}
            <ExternalLink className="size-3.5" />
          </a>
        </motion.div>
        <motion.div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground lg:justify-start" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.5 }}>
          <Badge className="bg-secondary/60 text-[11px] font-medium text-black">{t("tagInternal")}</Badge>
          <Badge className="bg-secondary/60 text-[11px] font-medium text-black">{t("tagOffline")}</Badge>
          <Badge className="bg-secondary/60 text-[11px] font-medium text-black">{t("tagLargeCsr")}</Badge>
        </motion.div>
      </div>
      <motion.div className="relative mx-auto w-full max-w-md lg:max-w-none" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
        <div className="pointer-events-none absolute -inset-8 -z-10 bg-linear-to-br from-primary/15 via-primary/0 to-chart-3/25 blur-3xl" />
        <DemoCard />
      </motion.div>
    </section>
  );
}
