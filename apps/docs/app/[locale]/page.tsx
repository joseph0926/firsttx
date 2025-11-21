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
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-chart-2/20 blur-3xl" />
      <div className="-[radial-gradient(circle_at_top,var(--color-chart-3),transparent_70%)]/[25] absolute inset-x-[-60%] top-64 h-80" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent" />
    </div>
  );
}
