"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { docsNav } from "@/constants/docs-nav";

export function DocsSidebar() {
  const t = useTranslations("DocsNav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav className="sticky top-24 flex flex-col gap-4 text-sm">
      <div className="mb-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground/80 uppercase">{t("title")}</div>

      <div className="space-y-4">
        {docsNav.map((item) => {
          const hasChildren = item.children && item.children.length > 0;

          if (hasChildren) {
            return (
              <div key={item.id} className="space-y-1.5">
                <div className="px-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">{t(item.id)}</div>
                <div className="space-y-1">
                  {item.children!.map((child) => {
                    const childHref = `/${locale}${child.href}`;
                    const childActive = pathname === childHref || pathname?.startsWith(childHref + "/");

                    return (
                      <Link key={child.id} href={childHref} className={cn("group flex items-center justify-between rounded-xl px-3 py-2", "text-xs font-medium text-muted-foreground transition-colors", "hover:bg-muted/60 hover:text-foreground", childActive && "bg-muted/80 text-foreground shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.7)]")}>
                        <span>{t(child.id)}</span>
                        <span className={cn("h-1.5 w-1.5 rounded-full bg-transparent transition-all duration-200", "group-hover:bg-primary/40", childActive && "bg-primary/80 shadow-[0_0_12px_rgba(0,0,0,0.35)]")} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (!item.href) return null;

          const href = `/${locale}${item.href}`;
          const isActive = pathname === href || pathname?.startsWith(href + "/");

          return (
            <div key={item.id}>
              <Link href={href} className={cn("group flex items-center justify-between rounded-xl px-3 py-2", "text-xs font-medium text-muted-foreground transition-colors", "hover:bg-muted/60 hover:text-foreground", isActive && "bg-muted/80 text-foreground shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.7)]")}>
                <span>{t(item.id)}</span>
                <span className={cn("h-1.5 w-1.5 rounded-full bg-transparent transition-all duration-200", "group-hover:bg-primary/40", isActive && "bg-primary/80 shadow-[0_0_12px_rgba(0,0,0,0.35)]")} />
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
