import type { Metadata } from "next";
import PrepaintEn from "@/content/docs/prepaint.en.mdx";
import PrepaintKo from "@/content/docs/prepaint.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";

type PrepaintPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const DOCS_PATH = "/docs/prepaint";

export async function generateMetadata({ params }: PrepaintPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Prepaint - 재방문 visual snapshot replay" : "Prepaint - Revisit visual snapshot replay";

  const description = isKo ? "Prepaint가 마지막 화면을 DOM snapshot으로 캡처해 IndexedDB에 저장하고, 다음 방문의 부트 구간에 비상호작용 visual cache로 replay하는 방법과 권장 오버레이 모드, ViewTransition 연동을 설명합니다." : "Learn how Prepaint captures DOM snapshots in IndexedDB, replays a non-interactive visual cache during revisit boot, and integrates the recommended overlay mode and ViewTransition.";

  return createDocsMetadata({
    locale,
    path: DOCS_PATH,
    title,
    description,
    imageAlt: "FirstTx Docs - Prepaint",
  });
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
