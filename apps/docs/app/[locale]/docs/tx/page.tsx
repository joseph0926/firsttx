import type { Metadata } from "next";
import TxEn from "@/content/docs/tx.en.mdx";
import TxKo from "@/content/docs/tx.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";

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

  return createDocsMetadata({
    locale,
    path: DOCS_PATH,
    title,
    description,
    imageAlt: "FirstTx Docs - Tx",
  });
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
