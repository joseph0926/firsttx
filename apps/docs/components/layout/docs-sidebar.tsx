"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { docsNav } from "@/constants/docs-nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const t = useTranslations("DocsNav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav className="space-y-3 text-sm">
      {docsNav.map((item) => {
        const href = `/${locale}${item.href}`;
        const isActive = pathname === href || pathname?.startsWith(href + "/");

        return (
          <div key={item.href}>
            <Link href={href} className={cn("block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground", isActive && "bg-muted/60 font-medium text-foreground")}>
              {t(item.labelKey)}
            </Link>
            {item.children && (
              <div className="mt-1 space-y-1 pl-3">
                {item.children.map((child) => {
                  const childHref = `/${locale}${child.href}`;
                  const childActive = pathname === childHref || pathname?.startsWith(childHref + "/");

                  return (
                    <Link key={child.href} href={childHref} className={cn("block rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground", childActive && "bg-muted/60 font-medium text-foreground")}>
                      {t(child.labelKey)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
