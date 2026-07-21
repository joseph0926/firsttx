import type { Metadata } from "next";
import LocalFirstEn from "@/content/docs/local-first.en.mdx";
import LocalFirstKo from "@/content/docs/local-first.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";

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

  const description = isKo ? "Local-First로 Zod 스키마 기반 모델을 정의하고 IndexedDB snapshot, TTL, 버전, 탭 간 invalidation, 서버 재검증, Suspense를 사용하는 방법을 다룹니다." : "Learn how Local-First provides Zod-based models with IndexedDB snapshots, TTL, versioning, cross-tab invalidation, server revalidation, and Suspense integration.";

  return createDocsMetadata({
    locale,
    path: DOCS_PATH,
    title,
    description,
    imageAlt: "FirstTx Docs - Local-First",
  });
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
