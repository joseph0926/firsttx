"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button } from "./ui/button";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() || "/";

  const locales = [
    { code: "ko", label: "한국어", short: "KO" },
    { code: "en", label: "English", short: "EN" },
  ] as const;

  const current = locales.find((item) => item.code === locale) ?? locales[0];

  const handleSelect = (nextLocale: string) => {
    if (nextLocale === locale) return;

    const segments = pathname.split("/");

    const localeCodes = locales.map((l) => l.code);
    if (localeCodes.includes(segments[1] as "ko" | "en")) {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }

    const nextPath = segments.join("/") || "/";
    router.push(nextPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <span className="text-[11px] font-semibold uppercase">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-28">
        {locales.map((item) => (
          <DropdownMenuItem key={item.code} onClick={() => handleSelect(item.code)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
