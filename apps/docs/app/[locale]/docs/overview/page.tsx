import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import OverviewEn from "@/content/docs/overview.en.mdx";
import OverviewKo from "@/content/docs/overview.ko.mdx";

type DocsOverviewPageParams = {
  locale: string;
};

const DOCS_PATH = "/docs/overview";

export async function generateMetadata({ params }: { params: Promise<DocsOverviewPageParams> }): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Overview - FirstTx 개요" : "Overview - FirstTx Overview";

  const description = isKo ? "FirstTx가 어떤 문제를 해결하는지, Prepaint·Local-First·Tx 세 레이어가 어떻게 조합되는지 한눈에 설명하는 개요 페이지입니다." : "Overview of FirstTx explaining which problems it solves and how Prepaint, Local-First and Tx fit together.";

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
          alt: "FirstTx Docs - Overview",
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

export default async function DocsOverviewPage({ params }: { params: Promise<DocsOverviewPageParams> }) {
  const { locale } = await params;
  const MDX = locale === "ko" ? OverviewKo : OverviewEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
