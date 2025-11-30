import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import GettingStartedEn from "@/content/docs/getting-started.en.mdx";
import GettingStartedKo from "@/content/docs/getting-started.ko.mdx";

type DocsGettingStartedPageParams = {
  locale: string;
};

const DOCS_PATH = "/docs/getting-started";

export async function generateMetadata({ params }: { params: Promise<DocsGettingStartedPageParams> }): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Getting Started - 빠른 시작 가이드" : "Getting Started - Quick start guide";

  const description = isKo ? "Vite + React 기반 CSR 앱에 Prepaint, Local-First, Tx를 단계적으로 연결하는 빠른 시작 가이드입니다." : "Quick start guide for wiring Prepaint, Local-First and Tx into a Vite + React CSR app step by step.";

  const canonical = `/${locale}${DOCS_PATH}`;
  const languages: Record<string, string> = Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}${DOCS_PATH}`]));

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: "FirstTx Docs - Getting Started",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image.png"],
    },
  };
}

export default async function DocsGettingStartedPage({ params }: { params: Promise<DocsGettingStartedPageParams> }) {
  const { locale } = await params;
  const MDX = locale === "ko" ? GettingStartedKo : GettingStartedEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
