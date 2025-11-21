import { useTranslations } from "next-intl";
import { Timeline } from "./timeline";

export function ExperienceSection() {
  const t = useTranslations("Experience");
  const cards = t.raw("cards") as { title: string; description: string }[];

  return (
    <section className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">{t("eyebrow")}</h2>
        <p className="text-xl font-medium tracking-tight sm:text-2xl">{t("title")}</p>
        <p className="max-w-xl text-sm text-muted-foreground">{t("description")}</p>
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
    <div className="rounded-xl border border-border/60 bg-card/70 p-3 text-xs shadow-[0_14px_40px_-30px_rgba(15,23,42,0.9)]">
      <p className="mb-1 font-medium">{title}</p>
      <p className="text-[11px] text-muted-foreground/90">{description}</p>
    </div>
  );
}
