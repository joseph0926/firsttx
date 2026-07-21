type NavItemType = {
  id: "overview" | "docs" | "patterns" | "troubleshooting" | "reference";
  link: string;
};

export const navItems: NavItemType[] = [
  {
    id: "overview",
    link: "/docs/overview",
  },
  {
    id: "docs",
    link: "/docs/getting-started",
  },
  {
    id: "patterns",
    link: "/docs/patterns",
  },
  {
    id: "troubleshooting",
    link: "/docs/troubleshooting",
  },
  {
    id: "reference",
    link: "/docs/reference",
  },
];
