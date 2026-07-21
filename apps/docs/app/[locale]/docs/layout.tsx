import { DocsFrame } from "@/components/layout/docs-frame";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsFrame>{children}</DocsFrame>;
}
