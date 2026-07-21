"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { docsNav } from "@/constants/docs-nav";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/nav-link";

export function DocsSidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useTranslations("DocsNav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav className={cn("docs-sidebar", className)} aria-label={t("title")}>
      <div className="docs-sidebar-title">{t("title")}</div>
      <div className="docs-sidebar-groups">
        {docsNav.map((group) => {
          if (!group.children?.length) return null;
          const active = group.children.some((child) => pathname === `/${locale}${child.href}`);

          return (
            <section key={group.id}>
              <h2 className={cn(active && "is-active")}>{t(group.id)}</h2>
              <div>
                {group.children.map((child) => (
                  <NavLink key={child.id} href={`/${locale}${child.href}`} className="docs-sidebar-link" onClick={onNavigate}>
                    {t(child.id)}
                  </NavLink>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="docs-verification-links">
        <span>{locale === "ko" ? "검증" : "Verify"}</span>
        <a href="https://firsttx-playground.vercel.app" target="_blank" rel="noreferrer">
          Playground ↗
        </a>
        <NavLink href={`/${locale}/docs/devtools`} indicator={false} className="docs-verification-link" onClick={onNavigate}>
          DevTools →
        </NavLink>
      </div>
    </nav>
  );
}
