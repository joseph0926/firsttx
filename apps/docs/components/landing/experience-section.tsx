import { useTranslations } from "next-intl";
import { Timeline } from "./timeline";

export function ExperienceSection() {
  const t = useTranslations("Experience");
  const cards = t.raw("cards") as { title: string; description: string }[];

  return (
    <section className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{t("eyebrow")}</h2>
        <p className="text-lg font-semibold tracking-tight text-balance sm:text-xl md:text-2xl">{t("title")}</p>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <ExperienceCard key={card.title} title={card.title} description={card.description} />
          ))}
        </div>
      </div>
      <Timeline />
    </section>
  );
}

function ExperienceCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-3 text-[11px] shadow-[0_14px_40px_-30px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card/90">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 size-1.5 rounded-full bg-primary/70" />
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 leading-relaxed text-muted-foreground/90">{description}</p>
        </div>
      </div>
    </div>
  );
}
