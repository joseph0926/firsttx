import type { Metadata } from "next";
import GettingStartedEn from "@/content/docs/getting-started.en.mdx";
import GettingStartedKo from "@/content/docs/getting-started.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";
import { SetupSelector } from "@/components/setup-selector";

type DocsGettingStartedPageParams = {
  locale: string;
};

const DOCS_PATH = "/docs/getting-started";

export async function generateMetadata({ params }: { params: Promise<DocsGettingStartedPageParams> }): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Getting Started - 빠른 시작 가이드" : "Getting Started - Quick start guide";

  const description = isKo ? "Vite + React 기반 CSR 앱에 Prepaint, Local-First, Tx를 단계적으로 연결하는 빠른 시작 가이드입니다." : "Quick start guide for wiring Prepaint, Local-First and Tx into a Vite + React CSR app step by step.";

  return createDocsMetadata({
    locale,
    path: DOCS_PATH,
    title,
    description,
    imageAlt: "FirstTx Docs - Getting Started",
  });
}

export default async function DocsGettingStartedPage({ params }: { params: Promise<DocsGettingStartedPageParams> }) {
  const { locale } = await params;
  const MDX = locale === "ko" ? GettingStartedKo : GettingStartedEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
      <section className="mt-16 border-t border-border pt-10" aria-labelledby="getting-started-setup-title">
        <h2 id="getting-started-setup-title" className="text-2xl font-semibold tracking-tight">
          {locale === "ko" ? "먼저 도입 범위를 선택하세요" : "Choose your adoption scope first"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{locale === "ko" ? "선택은 아래 가이드의 기술 계약을 바꾸지 않고, 필요한 설치와 검증 경로만 좁혀 줍니다." : "Your choice keeps the guide's technical contract intact and narrows the install and verification path."}</p>
        <SetupSelector locale={locale as "ko" | "en"} compact />
      </section>
    </main>
  );
}
