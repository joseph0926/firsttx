import { CompareApproaches } from '@/components/compare-approaches';
import { HowItWorks } from '@/components/how-it-works';
import { LandingHero } from '@/components/landing-hero';
import { RealScenarios } from '@/components/real-scenarios';

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <HowItWorks />
      <CompareApproaches />
      <RealScenarios />
    </>
  );
}
