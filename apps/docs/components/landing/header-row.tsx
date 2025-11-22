import { useTranslations } from "next-intl";

export function HeaderRow() {
  const t = useTranslations("HeaderRow");

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{t("eyebrow")}</h2>
        <p className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</p>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">{t("description")}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <Chip>{t("chipReact")}</Chip>
        <Chip>{t("chipVite")}</Chip>
        <Chip>{t("chipOptional")}</Chip>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/40 px-2.5 py-1 text-[11px]">
      <span className="size-1.5 rounded-full bg-primary/60" />
      <span>{children}</span>
    </span>
  );
}
