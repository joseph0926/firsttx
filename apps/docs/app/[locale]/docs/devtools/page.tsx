import type { Locale } from "@/i18n/routing";
import DevtoolsKo from "@/content/docs/devtools.ko.mdx";
import DevtoolsEn from "@/content/docs/devtools.en.mdx";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function DevtoolsPage({ params }: Props) {
  const { locale } = await params;

  const Content = locale === "ko" ? DevtoolsKo : DevtoolsEn;

  return <Content />;
}
