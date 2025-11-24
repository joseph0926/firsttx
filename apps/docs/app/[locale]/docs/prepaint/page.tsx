import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import PrepaintEn from "@/content/docs/prepaint.en.mdx";
import PrepaintKo from "@/content/docs/prepaint.ko.mdx";

type PrepaintPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const DOCS_PATH = "/docs/prepaint";

export async function generateMetadata({ params }: PrepaintPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Prepaint - 재방문 0ms 화면 복원 레이어" : "Prepaint - 0ms revisit restore layer";

  const description = isKo ? "Prepaint가 마지막 화면을 DOM 스냅샷으로 캡처해 IndexedDB에 저장하고, 다음 방문 시 React 하이드레이션 전에 복원하는 방법과 부트 스크립트, 오버레이 모드, ViewTransition 연동까지 자세히 설명합니다." : "Deep dive into Prepaint: how it captures DOM snapshots into IndexedDB, restores them before React hydration, and integrates the boot script, overlay mode and ViewTransition for smooth revisit experiences.";

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
          alt: "FirstTx Docs - Prepaint",
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

export default async function PrepaintPage({ params }: PrepaintPageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? PrepaintKo : PrepaintEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
