"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const locales = [
  { code: "ko", label: "한국어", short: "KO" },
  { code: "en", label: "English", short: "EN" },
] as const;

export function NavbarSettingsDropdown() {
  const { setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() || "/";

  const currentLocale = locales.find((item) => item.code === locale) ?? locales[0];

  const handleLocaleChange = (nextLocale: (typeof locales)[number]["code"]) => {
    if (nextLocale === locale) return;

    const segments = pathname.split("/");

    const localeCodes = locales.map((l) => l.code);
    if (localeCodes.includes(segments[1] as (typeof locales)[number]["code"])) {
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
        <Button variant="outline" size="icon" className="relative">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme and language</span>
          <span className="pointer-events-none absolute right-1 bottom-1 text-[10px] font-semibold uppercase">{currentLocale.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Language</DropdownMenuLabel>
          {locales.map((item) => (
            <DropdownMenuItem key={item.code} onClick={() => handleLocaleChange(item.code)} className="cursor-pointer">
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
