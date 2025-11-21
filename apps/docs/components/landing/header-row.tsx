import { useTranslations } from "next-intl";

export function HeaderRow() {
  const t = useTranslations("HeaderRow");

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">{t("eyebrow")}</h2>
        <p className="text-xl font-medium tracking-tight sm:text-2xl">{t("title")}</p>
        <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">{t("description")}</p>
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
  return <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">{children}</span>;
}
