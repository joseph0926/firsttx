import GettingStartedKo from "@/content/docs/getting-started.ko.mdx";
import GettingStartedEn from "@/content/docs/getting-started.en.mdx";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function GettingStartedPage({ params }: Props) {
  const { locale } = await params;

  const Content = locale === "ko" ? GettingStartedKo : GettingStartedEn;

  return <Content />;
}
