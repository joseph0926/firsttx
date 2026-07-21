"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { navItems } from "@/constants/nav";
import { cn } from "@/lib/utils";
import { NavbarSettingsDropdown } from "@/components/navbar-settings-dropdown";

const copy = {
  ko: {
    overview: "개요",
    docs: "문서",
    patterns: "패턴",
    troubleshooting: "문제 해결",
    reference: "레퍼런스",
    open: "내비게이션 열기",
    close: "내비게이션 닫기",
    global: "전역 내비게이션",
    playground: "Playground에서 실행하기",
    github: "GitHub 저장소",
  },
  en: {
    overview: "Overview",
    docs: "Docs",
    patterns: "Patterns",
    troubleshooting: "Troubleshooting",
    reference: "Reference",
    open: "Open navigation",
    close: "Close navigation",
    global: "Global navigation",
    playground: "Run in Playground",
    github: "GitHub repository",
  },
} as const;

export function Navbar() {
  const locale = useLocale() as "ko" | "en";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const text = copy[locale];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/88">
      <div className="mx-auto grid min-h-16 w-full max-w-[1320px] grid-cols-[1fr_auto] items-center px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href={`/${locale}`} className="flex w-fit items-center gap-2.5 rounded-md py-2 pr-3" aria-label="FirstTx">
          <Image src="/logo/firsttx_logo.png" alt="" width={28} height={28} priority />
          <span className="text-[15px] font-bold tracking-[-0.03em]">FirstTx</span>
          <span className="border-l border-border pl-2 font-mono text-[8px] font-bold tracking-[0.18em] text-muted-foreground">DOCS</span>
        </Link>
        <nav aria-label={text.global} className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const href = `/${locale}${item.link}`;
            const active = item.id === "docs" ? pathname?.startsWith(`/${locale}/docs/`) && !pathname?.includes("/patterns") && !pathname?.includes("/troubleshooting") && !pathname?.includes("/reference") : pathname === href;

            return (
              <Link key={item.id} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-full px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-muted text-foreground")}>
                {text[item.id]}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <NavbarSettingsDropdown />
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background lg:hidden" aria-label={open ? text.close : text.open} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav aria-label={text.global} className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <div className="mx-auto grid max-w-[760px] gap-1">
            {navItems.map((item) => (
              <Link key={item.id} href={`/${locale}${item.link}`} className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-muted" onClick={() => setOpen(false)}>
                {text[item.id]}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <a href="https://firsttx-playground.vercel.app" target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-3 text-xs font-semibold">
                {text.playground} ↗
              </a>
              <a href="https://github.com/joseph0926/firsttx" target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-3 text-xs font-semibold">
                {text.github} ↗
              </a>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
