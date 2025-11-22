import { useTranslations } from "next-intl";
import { NavbarButton, NavbarLogo, NavbarRoot, NavBody, NavItems } from "../ui/resizable-navbar";
import { navItems } from "@/constants/nav";
import { MobileNavbar } from "./mobile-navbar";

export function Navbar({ scrollContainerRef }: { scrollContainerRef?: React.RefObject<HTMLElement | null> }) {
  const t = useTranslations("Navbar");

  return (
    <NavbarRoot scrollContainerRef={scrollContainerRef}>
      <NavBody>
        <NavbarLogo src="/logo/firsttx_logo.png" href="/" title="Firsttx" subTitle={t("tagline")} />
        <NavItems items={navItems} />
        <div className="flex items-center gap-4">
          <NavbarButton variant="secondary">Login</NavbarButton>
          <NavbarButton variant="primary">Book a call</NavbarButton>
        </div>
      </NavBody>
      <MobileNavbar />
    </NavbarRoot>
  );
}
