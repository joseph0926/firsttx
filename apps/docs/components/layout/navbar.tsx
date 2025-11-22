import { NavbarLogo, NavbarRoot, NavBody, NavItems } from "../ui/resizable-navbar";
import { navItems } from "@/constants/nav";
import { MobileNavbar } from "./mobile-navbar";
import { NavbarSettingsDropdown } from "../navbar-settings-dropdown";

export function Navbar({ scrollContainerRef }: { scrollContainerRef?: React.RefObject<HTMLElement | null> }) {
  return (
    <NavbarRoot scrollContainerRef={scrollContainerRef}>
      <NavBody>
        <NavbarLogo src="/logo/firsttx_logo.png" href="/" title="Firsttx" />
        <NavItems items={navItems} />
        <div className="flex items-center gap-3">
          <NavbarSettingsDropdown />
        </div>
      </NavBody>
      <MobileNavbar />
    </NavbarRoot>
  );
}
