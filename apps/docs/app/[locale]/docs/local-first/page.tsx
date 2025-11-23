import type { Locale } from "@/i18n/routing";
import LocalFirstKo from "@/content/docs/local-first.ko.mdx";
import LocalFirstEn from "@/content/docs/local-first.en.mdx";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function LocalFirstPage({ params }: Props) {
  const { locale } = await params;

  const Content = locale === "ko" ? LocalFirstKo : LocalFirstEn;

  return <Content />;
}
