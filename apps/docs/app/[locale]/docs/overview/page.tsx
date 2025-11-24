import type { Locale } from "@/i18n/routing";
import OverviewKo from "@/content/docs/overview.ko.mdx";
import OverviewEn from "@/content/docs/overview.en.mdx";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function DocsHomePage({ params }: Props) {
  const { locale } = await params;

  const Content = locale === "ko" ? OverviewKo : OverviewEn;

  return <Content />;
}
