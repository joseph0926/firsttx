import type { Locale } from "@/i18n/routing";
import PrepaintKo from "@/content/docs/prepaint.ko.mdx";
import PrepaintEn from "@/content/docs/prepaint.en.mdx";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function PrepaintPage({ params }: Props) {
  const { locale } = await params;

  const Content = locale === "ko" ? PrepaintKo : PrepaintEn;

  return <Content />;
}
