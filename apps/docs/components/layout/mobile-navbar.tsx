"use client";

import { useState } from "react";
import { MobileNav, MobileNavHeader, MobileNavMenu, MobileNavToggle, NavbarLogo } from "../ui/resizable-navbar";
import { navItems } from "@/constants/nav";
import { NavbarSettingsDropdown } from "../navbar-settings-dropdown";
import Link from "next/link";

export function MobileNavbar({ visible }: { visible?: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  return (
    <MobileNav visible={visible}>
      <MobileNavHeader>
        <NavbarLogo src="/logo/firsttx_logo.png" href="/" title="Firsttx" />
        <div className="flex items-center gap-3">
          <NavbarSettingsDropdown />
          <MobileNavToggle isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        </div>
      </MobileNavHeader>
      <MobileNavMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
        {navItems.map((item, idx) => (
          <Link key={`mobile-link-${idx}`} href={item.link} onClick={() => setIsMobileMenuOpen(false)} className="relative text-neutral-600 dark:text-neutral-300">
            <span className="block">{item.name}</span>
          </Link>
        ))}
      </MobileNavMenu>
    </MobileNav>
  );
}
