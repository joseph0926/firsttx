import type { Metadata } from "next";
import DevtoolsEn from "@/content/docs/devtools.en.mdx";
import DevtoolsKo from "@/content/docs/devtools.ko.mdx";
import { createDocsMetadata } from "@/lib/docs/metadata";

type DevtoolsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const DOCS_PATH = "/docs/devtools";

export async function generateMetadata({ params }: DevtoolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "DevTools - FirstTx 트랜잭션과 모델 디버깅" : "DevTools - Inspecting FirstTx transactions and models";

  const description = isKo ? "FirstTx DevTools 크롬 확장으로 Prepaint, Local-First, Tx의 캡처, 복원, 동기화, 트랜잭션 이벤트를 타임라인으로 확인하고, 오류를 빠르게 디버깅하는 방법을 소개합니다." : "Guide to the FirstTx DevTools Chrome extension: inspect Prepaint, Local-First and Tx events such as capture, restore, sync and transactions on a timeline to debug issues faster.";

  return createDocsMetadata({
    locale,
    path: DOCS_PATH,
    title,
    description,
    imageAlt: "FirstTx Docs - DevTools",
  });
}

export default async function DevtoolsPage({ params }: DevtoolsPageProps) {
  const { locale } = await params;
  const MDX = locale === "ko" ? DevtoolsKo : DevtoolsEn;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <MDX />
    </main>
  );
}
