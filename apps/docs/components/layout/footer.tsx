import { ExternalLink } from "lucide-react";
import { GitHubIcon } from "../ui/icons";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-16 border-t border-border/60 pt-6 text-[11px] text-muted-foreground sm:flex sm:items-center sm:justify-between">
      <p className="mb-2 sm:mb-0">{t("copyright")}</p>
      <div className="flex flex-wrap gap-4">
        <a href="https://github.com/joseph0926/firsttx" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
          <GitHubIcon className="size-3.5" />
          {t("github")}
        </a>
        <a href="https://firsttx-playground.vercel.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
          {t("playground")}
          <ExternalLink className="size-3" />
        </a>
      </div>
    </footer>
  );
}
