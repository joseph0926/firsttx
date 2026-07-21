import type { Metadata } from "next";
import PatternsEn from "@/content/docs/patterns.en.mdx";
import PatternsKo from "@/content/docs/patterns.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";

type PatternsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PatternsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  return createDocsMetadata({
    locale,
    path: "/docs/patterns",
    title: isKo ? "Patterns - 레이어 조합 패턴" : "Patterns - Layer composition",
    description: isKo ? "Prepaint, Local-First와 Tx를 책임 경계를 유지하며 조합하고 검증하는 패턴을 설명합니다." : "Patterns for composing and verifying Prepaint, Local-First, and Tx while preserving each layer's responsibility.",
    imageAlt: isKo ? "FirstTx Docs - 레이어 조합 패턴" : "FirstTx Docs - Layer composition patterns",
  });
}

export default async function PatternsPage({ params }: PatternsPageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? PatternsKo : PatternsEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
