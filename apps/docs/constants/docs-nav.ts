export type DocsNavItem = {
  id: string;
  href?: string;
  children?: DocsNavItem[];
};

export const docsNav: DocsNavItem[] = [
  {
    id: "sectionIntro",
    children: [
      {
        id: "overview",
        href: "/docs",
      },
      {
        id: "gettingStarted",
        href: "/docs/getting-started",
      },
    ],
  },
  {
    id: "sectionLayers",
    children: [
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
    ],
  },
  {
    id: "sectionDevtools",
    children: [
      {
        id: "devtools",
        href: "/docs/devtools",
      },
    ],
  },
  {
    id: "sectionGuides",
    children: [
      {
        id: "patterns",
        href: "/docs/patterns",
      },
    ],
  },
];
