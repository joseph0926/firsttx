"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseLinkProps = ComponentPropsWithoutRef<typeof Link>;

interface NavLinkProps extends Omit<BaseLinkProps, "href" | "children"> {
  href: string;
  children: ReactNode;
  exact?: boolean;
  isActive?: boolean;
  indicator?: boolean;
  className?: string;
}

export function NavLink({ href, children, exact = false, isActive, indicator = true, className, ...linkProps }: NavLinkProps) {
  const pathname = usePathname();

  const computedActive = typeof isActive === "boolean" ? isActive : typeof pathname === "string" ? (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")) : false;

  return (
    <Link href={href} aria-current={computedActive ? "page" : undefined} className={cn("group flex items-center justify-between rounded-xl px-3 py-2", "text-xs font-medium text-muted-foreground transition-colors", "hover:bg-muted/60 hover:text-foreground", computedActive && "bg-muted/80 text-foreground shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.7)]", className)} {...linkProps}>
      <span>{children}</span>
      {indicator && <span className={cn("h-1.5 w-1.5 rounded-full bg-transparent transition-all duration-200", "group-hover:bg-primary/40", computedActive && "bg-primary/80 shadow-[0_0_12px_rgba(0,0,0,0.35)]")} />}
    </Link>
  );
}
