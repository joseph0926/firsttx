import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import LocalFirstEn from "@/content/docs/local-first.en.mdx";
import LocalFirstKo from "@/content/docs/local-first.ko.mdx";

type LocalFirstPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const DOCS_PATH = "/docs/local-first";

export async function generateMetadata({ params }: LocalFirstPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Local-First - IndexedDB 기반 동기 데이터 레이어" : "Local-First - IndexedDB-backed data layer";

  const description = isKo ? "Local-First로 Zod 스키마 기반 모델을 정의하고, IndexedDB를 단일 소스로 사용하며, TTL, 버전, 멀티 탭 브로드캐스트, Suspense 통합으로 오프라인 내구성을 확보하는 방법을 다룹니다." : "Learn how Local-First defines Zod-based models on top of IndexedDB as the single source of truth, with TTL, versioning, cross-tab broadcast and Suspense integration for offline-durable state.";

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
          alt: "FirstTx Docs - Local-First",
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

export default async function LocalFirstPage({ params }: LocalFirstPageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? LocalFirstKo : LocalFirstEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
