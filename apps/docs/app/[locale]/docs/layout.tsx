import type { ReactNode } from "react";
import { DocsSidebar } from "@/components/layout/docs-sidebar";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 pt-16 pb-16 sm:px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 border-r border-border/60 pr-4 lg:block">
          <DocsSidebar />
        </aside>
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
