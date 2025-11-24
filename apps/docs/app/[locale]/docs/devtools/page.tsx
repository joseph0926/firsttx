import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import DevtoolsEn from "@/content/docs/devtools.en.mdx";
import DevtoolsKo from "@/content/docs/devtools.ko.mdx";

type DevtoolsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const DOCS_PATH = "/docs/devtools";

export async function generateMetadata({ params }: DevtoolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "DevTools - FirstTx 트랜잭션과 모델 디버깅" : "DevTools - Inspecting FirstTx transactions and models";

  const description = isKo ? "FirstTx DevTools 크롬 확장으로 Prepaint, Local-First, Tx의 캡처, 복원, 동기화, 트랜잭션 이벤트를 타임라인으로 확인하고, 오류를 빠르게 디버깅하는 방법을 소개합니다." : "Guide to the FirstTx DevTools Chrome extension: inspect Prepaint, Local-First and Tx events such as capture, restore, sync and transactions on a timeline to debug issues faster.";

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
          alt: "FirstTx Docs - DevTools",
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

export default async function DevtoolsPage({ params }: DevtoolsPageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? DevtoolsKo : DevtoolsEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
