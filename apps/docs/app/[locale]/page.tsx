import type { Metadata } from "next";
import { LandingRedesign } from "@/components/landing/landing-redesign";
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

  const title = isKo ? "FirstTx - React를 위한 Prepaint·Local-First·Tx 툴킷" : "FirstTx - Prepaint, Local-First & Tx toolkit for React";

  const description = isKo ? "FirstTx는 React 기반 CSR 앱에 재방문 visual replay, persistent client cache, 낙관적 saga를 제공하는 3-레이어 툴킷입니다." : "FirstTx is a three-layer toolkit for React CSR apps with revisit visual replay, a persistent client cache, and optimistic sagas.";

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
          alt: isKo ? "FirstTx - React용 Prepaint, Local-First, Tx 툴킷" : "FirstTx - Prepaint, Local-First & Tx toolkit for React",
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
    description: isKo ? "React CSR 앱을 위한 재방문 visual replay·persistent client cache·낙관적 saga 툴킷." : "A revisit visual replay, persistent client cache, and optimistic saga toolkit for React CSR apps.",
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
    <>
      <LandingJsonLd locale={locale} />
      <LandingRedesign locale={locale as "ko" | "en"} />
    </>
  );
}
