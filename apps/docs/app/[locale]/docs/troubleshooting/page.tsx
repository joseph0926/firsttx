import type { Metadata } from "next";
import TroubleshootingEn from "@/content/docs/troubleshooting.en.mdx";
import TroubleshootingKo from "@/content/docs/troubleshooting.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";

type TroubleshootingPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: TroubleshootingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  return createDocsMetadata({
    locale,
    path: "/docs/troubleshooting",
    title: isKo ? "Troubleshooting - 증상별 복구" : "Troubleshooting - Symptom-based recovery",
    description: isKo ? "Prepaint replay, Local-First data, Tx rollback과 DevTools payload 문제를 증상별로 진단하고 복구합니다." : "Diagnose and recover Prepaint replay, Local-First data, Tx rollback, and DevTools payload issues by symptom.",
    imageAlt: isKo ? "FirstTx Docs - 문제 해결" : "FirstTx Docs - Troubleshooting",
  });
}

export default async function TroubleshootingPage({ params }: TroubleshootingPageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? TroubleshootingKo : TroubleshootingEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
