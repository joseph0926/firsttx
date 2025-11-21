import { Hero } from "@/components/landing/hero";
import { HeaderRow } from "@/components/landing/header-row";
import { LayersGrid } from "@/components/landing/layers-grid";
import { ExperienceSection } from "@/components/landing/experience-section";
import { QuickStartSection } from "@/components/landing/quick-start";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundGlow />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pt-4 pb-16 sm:px-6 lg:px-8">
        <LandingNavbar />
        <Hero />
        <section id="layers" className="mt-20 space-y-8 border-y border-border/60 py-12">
          <HeaderRow />
          <LayersGrid />
        </section>
        <ExperienceSection />
        <QuickStartSection />
        <LandingFooter />
      </div>
    </main>
  );
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute top-4 -left-40 h-80 w-80 rounded-full bg-chart-2/30 blur-3xl" />
      <div className="absolute top-80 -right-10 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-size-[80px_80px] opacity-[0.35] mix-blend-soft-light" />
      <div className="absolute inset-x-10 top-24 h-px bg-linear-to-r from-transparent via-border/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent" />
    </div>
  );
}
