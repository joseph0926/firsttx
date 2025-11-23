import { Hero } from "@/components/landing/hero";
import { HeaderRow } from "@/components/landing/header-row";
import { LayersGrid } from "@/components/landing/layers-grid";
import { ExperienceSection } from "@/components/landing/experience-section";
import { QuickStartSection } from "@/components/landing/quick-start";
import { BackgroundGlow } from "@/components/layout/background-glow";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <BackgroundGlow />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pt-4 pb-16 sm:px-6 lg:px-8">
        <Hero />
        <section id="layers" className="mt-20 space-y-8 border-y border-border/60 py-12">
          <HeaderRow />
          <LayersGrid />
        </section>
        <ExperienceSection />
        <QuickStartSection />
      </div>
    </main>
  );
}
