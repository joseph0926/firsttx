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

  const title = isKo ? "Tx - 트랜잭션 기반 낙관적 UI 실행기" : "Tx - Transactional optimistic UI executor";

  const description = isKo ? "Tx로 낙관적 UI 업데이트와 서버 요청을 하나의 트랜잭션으로 묶고, 재시도, 타임아웃, 보상(rollback), ViewTransition을 포함해 복잡한 다단계 작업을 안전하게 처리하는 방법을 설명합니다." : "See how Tx wraps optimistic UI updates and server requests in a single transaction, with retry, timeouts, compensation-based rollback and ViewTransition support for complex multi-step flows.";

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
