export type DocsNavItem = {
  labelKey: string;
  href: string;
  children?: DocsNavItem[];
};

export const docsNav: DocsNavItem[] = [
  {
    labelKey: "overview",
    href: "/docs",
  },
  {
    labelKey: "gettingStarted",
    href: "/docs/getting-started",
  },
  {
    labelKey: "prepaint",
    href: "/docs/prepaint",
  },
  {
    labelKey: "localFirst",
    href: "/docs/local-first",
  },
  {
    labelKey: "tx",
    href: "/docs/tx",
  },
  {
    labelKey: "devtools",
    href: "/docs/devtools",
  },
  {
    labelKey: "patterns",
    href: "/docs/patterns",
  },
];
