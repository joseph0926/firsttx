export type DocsNavItem = {
  id: string;
  href: string;
  children?: DocsNavItem[];
};

export const docsNav: DocsNavItem[] = [
  {
    id: "overview",
    href: "/docs",
  },
  {
    id: "gettingStarted",
    href: "/docs/getting-started",
  },
  {
    id: "prepaint",
    href: "/docs/prepaint",
  },
  {
    id: "localFirst",
    href: "/docs/local-first",
  },
  {
    id: "tx",
    href: "/docs/tx",
  },
  {
    id: "devtools",
    href: "/docs/devtools",
  },
  {
    id: "patterns",
    href: "/docs/patterns",
  },
];
