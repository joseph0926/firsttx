import TxKo from "@/content/docs/tx.ko.mdx";
import TxEn from "@/content/docs/tx.en.mdx";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TxPage({ params }: Props) {
  const { locale } = await params;

  const Content = locale === "ko" ? TxKo : TxEn;

  return <Content />;
}
