import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { HeaderRow } from "@/components/landing/header-row";
import { LayersGrid } from "@/components/landing/layers-grid";
import { ExperienceSection } from "@/components/landing/experience-section";
import { QuickStartSection } from "@/components/landing/quick-start";
import { BackgroundGlow } from "@/components/layout/background-glow";
import { routing } from "@/i18n/routing";

type LandingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const SITE_URL = "https://firsttx.store";
const OG_IMAGE = `${SITE_URL}/opengraph-image.png`;

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { locale } = await params;

  const isKo = locale === "ko";

  const title = isKo ? "FirstTx - React 19를 위한 Prepaint·Local-First·Tx 툴킷" : "FirstTx - Prepaint, Local-First & Tx toolkit for React 19";

  const description = isKo ? "FirstTx는 React 19 기반 CSR 앱에서 재방문 속도, 오프라인 내구성, 낙관적 UI를 한 번에 해결하는 3-레이어 툴킷입니다. Prepaint, Local-First, Tx로 대시보드·내부 도구·SaaS의 사용자 경험을 개선해 보세요." : "FirstTx is a three-layer toolkit for React 19 CSR apps that fixes revisit performance, offline durability and optimistic UI at once. Use Prepaint, Local-First and Tx to upgrade dashboards, internal tools and SaaS apps.";

  const url = `${SITE_URL}/${locale}`;

  const languages: Record<string, string> = Object.fromEntries(routing.locales.map((loc) => [loc, `${SITE_URL}/${loc}`]));

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "FirstTx Docs",
      type: "website",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: isKo ? "FirstTx - React 19용 Prepaint, Local-First, Tx 툴킷" : "FirstTx - Prepaint, Local-First & Tx toolkit for React 19",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

function LandingJsonLd({ locale }: { locale: string }) {
  const isKo = locale === "ko";

  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FirstTx",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/${locale}`,
    description: isKo ? "React 19 기반 CSR 앱에서 재방문 속도, 오프라인 내구성, 낙관적 UI를 향상시키는 Prepaint·Local-First·Tx 툴킷." : "A toolkit for React 19 CSR apps that improves revisit performance, offline durability and optimistic UI with Prepaint, Local-First and Tx.",
    publisher: {
      "@type": "Organization",
      name: "FirstTx",
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <LandingJsonLd locale={locale} />
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
