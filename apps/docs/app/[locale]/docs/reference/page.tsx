import type { Metadata } from "next";
import ReferenceEn from "@/content/docs/reference.en.mdx";
import ReferenceKo from "@/content/docs/reference.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";

type ReferencePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ReferencePageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  return createDocsMetadata({
    locale,
    path: "/docs/reference",
    title: isKo ? "Reference - 공개 API와 event contract" : "Reference - Public API and event contracts",
    description: isKo ? "FirstTx package root의 공개 API, 오류 property와 runtime event contract를 빠르게 다시 찾습니다." : "Find FirstTx package-root exports, error properties, and runtime event contracts.",
    imageAlt: isKo ? "FirstTx Docs - API Reference" : "FirstTx Docs - API Reference",
  });
}

export default async function ReferencePage({ params }: ReferencePageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? ReferenceKo : ReferenceEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
