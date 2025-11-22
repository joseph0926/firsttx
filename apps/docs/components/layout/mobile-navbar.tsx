"use client";

import { useState } from "react";
import { MobileNav, MobileNavHeader, MobileNavMenu, MobileNavToggle, NavbarButton, NavbarLogo } from "../ui/resizable-navbar";
import { useTranslations } from "next-intl";
import { navItems } from "@/constants/nav";

export function MobileNavbar() {
  const t = useTranslations("Navbar");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  return (
    <MobileNav>
      <MobileNavHeader>
        <NavbarLogo src="/logo/firsttx_logo.png" href="/" title="Firsttx" />
        <MobileNavToggle isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      </MobileNavHeader>
      <MobileNavMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
        {navItems.map((item, idx) => (
          <a key={`mobile-link-${idx}`} href={item.link} onClick={() => setIsMobileMenuOpen(false)} className="relative text-neutral-600 dark:text-neutral-300">
            <span className="block">{item.name}</span>
          </a>
        ))}
        <div className="flex w-full flex-col gap-4">
          <NavbarButton onClick={() => setIsMobileMenuOpen(false)} variant="primary" className="w-full">
            Book a call
          </NavbarButton>
        </div>
      </MobileNavMenu>
    </MobileNav>
  );
}
