import type { Metadata } from "next";
import OverviewEn from "@/content/docs/overview.en.mdx";
import OverviewKo from "@/content/docs/overview.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";
import { SetupSelector } from "@/components/setup-selector";

type DocsOverviewPageParams = {
  locale: string;
};

const DOCS_PATH = "/docs/overview";

export async function generateMetadata({ params }: { params: Promise<DocsOverviewPageParams> }): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "Overview - FirstTx 개요" : "Overview - FirstTx Overview";

  const description = isKo ? "FirstTx가 어떤 문제를 해결하는지, Prepaint·Local-First·Tx 세 레이어가 어떻게 조합되는지 한눈에 설명하는 개요 페이지입니다." : "Overview of FirstTx explaining which problems it solves and how Prepaint, Local-First and Tx fit together.";

  return createDocsMetadata({
    locale,
    path: DOCS_PATH,
    title,
    description,
    imageAlt: "FirstTx Docs - Overview",
  });
}

export default async function DocsOverviewPage({ params }: { params: Promise<DocsOverviewPageParams> }) {
  const { locale } = await params;
  const MDX = locale === "ko" ? OverviewKo : OverviewEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
      <section className="mt-16 border-t border-border pt-10" aria-labelledby="overview-setup-title">
        <h2 id="overview-setup-title" className="text-2xl font-semibold tracking-tight">
          {locale === "ko" ? "해결할 문제에서 도입 경로로" : "From the problem to an adoption path"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{locale === "ko" ? "필요한 레이어를 선택하면 같은 구성 모델로 설치 명령과 검증 경로를 확인할 수 있습니다." : "Choose the layer you need to see its install command and verification path in the shared setup model."}</p>
        <SetupSelector locale={locale as "ko" | "en"} compact />
      </section>
    </main>
  );
}
