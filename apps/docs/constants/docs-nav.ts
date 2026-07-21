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
        href: "/docs/overview",
      },
      {
        id: "gettingStarted",
        href: "/docs/getting-started",
      },
    ],
  },
  {
    id: "sectionBuild",
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
      {
        id: "patterns",
        href: "/docs/patterns",
      },
    ],
  },
  {
    id: "sectionVerify",
    children: [
      {
        id: "devtools",
        href: "/docs/devtools",
      },
      {
        id: "troubleshooting",
        href: "/docs/troubleshooting",
      },
    ],
  },
  {
    id: "sectionReference",
    children: [
      {
        id: "reference",
        href: "/docs/reference",
      },
    ],
  },
];
