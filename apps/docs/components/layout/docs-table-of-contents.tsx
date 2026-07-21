"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  label: string;
  depth: 2 | 3;
};

function getHeadingAnchorId(heading: HTMLElement) {
  const anchor = heading.previousElementSibling;
  return anchor instanceof HTMLElement ? anchor.dataset.docAnchor : undefined;
}

export function DocsTableOfContents({ onNavigate }: { onNavigate?: () => void }) {
  const locale = useLocale();
  const pathname = usePathname();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>("#docs-reading [data-doc-heading]"));
    const targets = headings.flatMap((heading) => {
      const id = getHeadingAnchorId(heading);
      return id ? [{ heading, id }] : [];
    });
    const ids = new Map(targets.map(({ heading, id }) => [heading, id]));
    const nextItems = targets.map(({ heading, id }) => {
      const label = heading.textContent?.trim() ?? "";
      return { id, label, depth: heading.tagName === "H2" ? 2 : 3 } as TocItem;
    });

    const timer = window.setTimeout(() => {
      const hashId = window.location.hash.slice(1);
      const aliasTarget = hashId ? document.getElementById(hashId)?.dataset.docAnchorAlias : undefined;
      setItems(nextItems);
      setActiveId(aliasTarget || hashId || nextItems[0]?.id || "");
    }, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target instanceof HTMLElement) {
          const id = ids.get(visible.target);
          if (id) setActiveId(id);
        }
      },
      { rootMargin: "-18% 0px -70% 0px" },
    );

    targets.forEach(({ heading }) => observer.observe(heading));
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  if (items.length === 0) return null;

  return (
    <nav className="docs-toc" aria-label={locale === "ko" ? "이 페이지" : "On this page"}>
      <div>{locale === "ko" ? "이 페이지" : "On this page"}</div>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={cn(item.depth === 3 && "is-nested", activeId === item.id && "is-active")} aria-current={activeId === item.id ? "location" : undefined} onClick={onNavigate}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
