import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import TxEn from "@/content/docs/tx.en.mdx";
import TxKo from "@/content/docs/tx.ko.mdx";

type TxPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const DOCS_PATH = "/docs/tx";

export async function generateMetadata({ params }: TxPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Tx - 낙관적 saga 실행기" : "Tx - Optimistic saga executor";

  const description = isKo ? "Tx로 낙관적 UI 업데이트와 서버 요청을 순서대로 실행하고, 재시도, 타임아웃, 역순 보상, ViewTransition을 연결하는 방법을 설명합니다." : "See how Tx sequences optimistic UI updates and server requests with retry, timeouts, reverse-order compensation, and ViewTransition support.";

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
          alt: "FirstTx Docs - Tx",
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

export default async function TxPage({ params }: TxPageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? TxKo : TxEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
