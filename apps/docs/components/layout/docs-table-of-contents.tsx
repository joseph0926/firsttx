"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  label: string;
  depth: 2 | 3;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function DocsTableOfContents({ onNavigate }: { onNavigate?: () => void }) {
  const locale = useLocale();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>("#docs-reading h2, #docs-reading h3"));
    const counts = new Map<string, number>();
    const nextItems = headings.map((heading) => {
      const label = heading.textContent?.trim() ?? "";
      const baseId = heading.id || slugify(label) || "section";
      const count = counts.get(baseId) ?? 0;
      counts.set(baseId, count + 1);
      const id = heading.id || (count === 0 ? baseId : `${baseId}-${count + 1}`);
      heading.id = id;
      return { id, label, depth: heading.tagName === "H2" ? 2 : 3 } as TocItem;
    });

    const timer = window.setTimeout(() => {
      setItems(nextItems);
      setActiveId(window.location.hash.slice(1) || nextItems[0]?.id || "");
    }, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-18% 0px -70% 0px" },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

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
