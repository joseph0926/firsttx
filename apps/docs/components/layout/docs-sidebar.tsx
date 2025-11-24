"use client";

import { Activity } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { docsNav } from "@/constants/docs-nav";
import { NavLink } from "@/components/nav-link";

interface DocsSidebarProps {
  isVisible?: boolean;
}

export function DocsSidebar({ isVisible = true }: DocsSidebarProps) {
  const t = useTranslations("DocsNav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <Activity mode={isVisible ? "visible" : "hidden"}>
      <nav className="sticky top-24 flex flex-col gap-4 text-sm">
        <div className="mb-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground/80 uppercase">{t("title")}</div>
        <div className="space-y-4">
          {docsNav.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            if (hasChildren) {
              const sectionActive = item.children!.some((child) => {
                const childHref = `/${locale}${child.href}`;
                return pathname === childHref || pathname?.startsWith(childHref + "/");
              });

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className={cn("px-1 text-[11px] font-semibold tracking-[0.14em] uppercase", sectionActive ? "text-foreground" : "text-muted-foreground/70")}>{t(item.id)}</div>
                  <div className="space-y-1">
                    {item.children!.map((child) => {
                      const childHref = `/${locale}${child.href}`;

                      return (
                        <NavLink key={child.id} href={childHref}>
                          {t(child.id)}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (!item.href) return null;

            const href = `/${locale}${item.href}`;

            return (
              <div key={item.id}>
                <NavLink href={href}>{t(item.id)}</NavLink>
              </div>
            );
          })}
        </div>
      </nav>
    </Activity>
  );
}
