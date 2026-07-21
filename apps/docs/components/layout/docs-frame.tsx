"use client";

import { useState } from "react";
import { List, Menu, X } from "lucide-react";
import { useLocale } from "next-intl";
import { DocsSidebar } from "./docs-sidebar";
import { DocsTableOfContents } from "./docs-table-of-contents";

export function DocsFrame({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [panel, setPanel] = useState<"docs" | "toc" | null>(null);
  const isKo = locale === "ko";

  return (
    <main id="main-content" className="docs-production">
      <div className="docs-mobile-tools">
        <button type="button" aria-expanded={panel === "docs"} aria-controls="mobile-docs-navigation" onClick={() => setPanel((value) => (value === "docs" ? null : "docs"))}>
          {panel === "docs" ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          {isKo ? "문서" : "Docs"}
        </button>
        <button type="button" aria-expanded={panel === "toc"} aria-controls="mobile-page-navigation" onClick={() => setPanel((value) => (value === "toc" ? null : "toc"))}>
          {panel === "toc" ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
          {isKo ? "이 페이지" : "On this page"}
        </button>
      </div>
      {panel === "docs" ? (
        <div id="mobile-docs-navigation" className="docs-mobile-panel">
          <DocsSidebar onNavigate={() => setPanel(null)} />
        </div>
      ) : null}
      {panel === "toc" ? (
        <div id="mobile-page-navigation" className="docs-mobile-panel">
          <DocsTableOfContents onNavigate={() => setPanel(null)} />
        </div>
      ) : null}
      <div className="docs-production-grid">
        <aside className="docs-desktop-sidebar">
          <DocsSidebar />
        </aside>
        <article id="docs-reading" className="docs-reading">
          {children}
        </article>
        <aside className="docs-desktop-toc">
          <DocsTableOfContents />
        </aside>
      </div>
    </main>
  );
}
