import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock, Callout, InstallTabs, ApiTable } from "./components/mdx";
import { DocsLink } from "./components/mdx/docs-link";

const baseHeading = "scroll-m-24 font-semibold tracking-tight text-foreground";
const baseText = "text-[0.94rem] leading-7 text-muted-foreground";

const components: MDXComponents = {
  h1: ({ className, ...props }: ComponentPropsWithoutRef<"h1">) => <h1 className={cn(baseHeading, "mb-5 text-[2.75rem] leading-[1.02] tracking-[-0.045em] md:text-[3.5rem] lg:text-[4rem]", className)} {...props} />,

  h2: ({ className, ...props }: ComponentPropsWithoutRef<"h2">) => <h2 className={cn(baseHeading, "mt-16 mb-4 border-t border-border pt-12 text-[1.75rem] leading-tight tracking-[-0.035em] md:text-[2rem]", className)} {...props} />,

  h3: ({ className, ...props }: ComponentPropsWithoutRef<"h3">) => <h3 className={cn(baseHeading, "mt-10 mb-3 text-lg tracking-[-0.02em] md:text-xl", className)} {...props} />,

  h4: ({ className, ...props }: ComponentPropsWithoutRef<"h4">) => <h4 className={cn(baseHeading, "mt-7 mb-2 text-base text-muted-foreground", className)} {...props} />,

  p: ({ className, ...props }: ComponentPropsWithoutRef<"p">) => <p className={cn(baseText, "my-4", className)} {...props} />,

  a: DocsLink,

  ul: ({ className, ...props }: ComponentPropsWithoutRef<"ul">) => <ul className={cn(baseText, "my-4 ml-5 list-disc space-y-2", className)} {...props} />,

  ol: ({ className, ...props }: ComponentPropsWithoutRef<"ol">) => <ol className={cn(baseText, "my-4 ml-5 list-decimal space-y-2", className)} {...props} />,

  li: ({ className, ...props }: ComponentPropsWithoutRef<"li">) => <li className={cn("marker:text-muted-foreground", className)} {...props} />,

  code: ({ className, ...props }: ComponentPropsWithoutRef<"code">) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={cn("font-mono text-[0.85em]", className)} {...props} />;
    }
    return <code className={cn("rounded border border-border bg-muted px-1.5 py-0.5", "align-[0.03em] font-mono text-[0.8em]", "text-foreground/90", className)} {...props} />;
  },

  pre: (props: ComponentPropsWithoutRef<"pre">) => <CodeBlock {...props} />,

  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<"blockquote">) => <blockquote className={cn(baseText, "mt-6 border-l-2 border-primary bg-muted/55 px-5 py-4 text-muted-foreground", className)} {...props} />,

  hr: ({ className, ...props }: ComponentPropsWithoutRef<"hr">) => <hr className={cn("my-10 border-border/70", "border-t", className)} {...props} />,

  table: ({ className, ...props }: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className={cn("w-full border-collapse border border-border bg-background text-left text-xs md:text-sm", className)} {...props} />
    </div>
  ),

  thead: ({ className, ...props }: ComponentPropsWithoutRef<"thead">) => <thead className={cn("bg-muted/60 text-[0.7rem] tracking-[0.12em] text-muted-foreground uppercase md:text-[0.75rem]", className)} {...props} />,

  th: ({ className, ...props }: ComponentPropsWithoutRef<"th">) => <th className={cn("border-b border-border/60 px-3 py-2 font-medium", className)} {...props} />,

  td: ({ className, ...props }: ComponentPropsWithoutRef<"td">) => <td className={cn("border-t border-border/40 px-3 py-2 align-top", className)} {...props} />,

  // eslint-disable-next-line
  img: ({ className, ...props }: ComponentPropsWithoutRef<"img">) => <img className={cn("my-6 max-h-[420px] w-full max-w-full rounded-xl border border-border bg-muted/30 object-contain", className)} {...props} />,

  div: ({ className, ...props }: ComponentPropsWithoutRef<"div">) => <div className={cn("relative", className)} {...props} />,

  InstallTabs,
  Callout,
  ApiTable,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
