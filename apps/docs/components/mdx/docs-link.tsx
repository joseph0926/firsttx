"use client";

import { useLocale } from "next-intl";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function DocsLink({ href, className, ...props }: ComponentPropsWithoutRef<"a">) {
  const locale = useLocale();
  const localizedHref = href?.startsWith("/docs") ? `/${locale}${href}` : href;

  return <a href={localizedHref} className={cn("relative inline font-semibold text-foreground underline decoration-border underline-offset-[5px] transition-colors hover:decoration-primary", "rounded-sm focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none", className)} {...props} />;
}
