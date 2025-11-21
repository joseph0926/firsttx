"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { layers } from "@/constants/home";

export function LayersGrid() {
  const t = useTranslations("Layers");

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {layers.map((layer, index) => {
        const Icon = layer.icon;
        const points = t.raw(`items.${layer.key}.points`) as string[];

        return (
          <motion.div key={layer.key} className="group relative flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.8)] backdrop-blur-xl transition hover:border-primary/60 hover:bg-card/80" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: index * 0.08, duration: 0.5 }} whileHover={{ y: -6, scale: 1.02 }}>
            <div className="inline-flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Icon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{t(`items.${layer.key}.name`)}</span>
                  <span className="text-[11px] text-muted-foreground">{t(`items.${layer.key}.role`)}</span>
                </div>
              </div>
              <span className="rounded-full bg-secondary/70 px-2 py-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{t("layerBadge", { order: index + 1 })}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t(`items.${layer.key}.description`)}</p>
            <ul className="mt-1 space-y-1.5 text-[11px] text-muted-foreground/90">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 rounded-full bg-primary/70" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </div>
  );
}
