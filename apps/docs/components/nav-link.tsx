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
    <Link href={href} aria-current={computedActive ? "page" : undefined} className={cn("group flex items-center justify-between rounded-lg px-2.5 py-2", "text-xs font-medium text-muted-foreground transition-colors", "hover:bg-muted/70 hover:text-foreground", computedActive && "bg-muted text-foreground", className)} {...linkProps}>
      <span>{children}</span>
      {indicator && <span className={cn("h-1.5 w-1.5 rounded-full bg-transparent transition-colors", "group-hover:bg-primary/40", computedActive && "bg-primary")} />}
    </Link>
  );
}
