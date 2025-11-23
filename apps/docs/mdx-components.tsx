import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock, Callout, InstallTabs } from "./components/mdx";

const baseHeading = "scroll-m-20 font-semibold tracking-tight text-foreground";
const baseText = "text-sm md:text-[0.95rem] leading-relaxed";

const components: MDXComponents = {
  h1: ({ className, ...props }: ComponentPropsWithoutRef<"h1">) => <h1 className={cn(baseHeading, "mb-8 text-3xl md:text-4xl lg:text-[2.6rem]", "bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent", "drop-shadow-sm", className)} {...props} />,

  h2: ({ className, ...props }: ComponentPropsWithoutRef<"h2">) => <h2 className={cn(baseHeading, "mt-12 mb-4 text-2xl md:text-[1.6rem]", "border-b border-border/60 pb-2", className)} {...props} />,

  h3: ({ className, ...props }: ComponentPropsWithoutRef<"h3">) => <h3 className={cn(baseHeading, "mt-8 mb-3 text-lg md:text-xl", className)} {...props} />,

  h4: ({ className, ...props }: ComponentPropsWithoutRef<"h4">) => <h4 className={cn(baseHeading, "mt-6 mb-2 text-base md:text-[1.05rem]", "text-muted-foreground", className)} {...props} />,

  p: ({ className, ...props }: ComponentPropsWithoutRef<"p">) => <p className={cn(baseText, "my-3", className)} {...props} />,

  a: ({ className, ...props }: ComponentPropsWithoutRef<"a">) => <a className={cn("relative inline-flex items-center gap-1 font-medium", "text-primary decoration-transparent underline-offset-[6px]", "transition-colors duration-150", "hover:text-primary-foreground hover:decoration-primary/50", "rounded-sm focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none", className)} {...props} />,

  ul: ({ className, ...props }: ComponentPropsWithoutRef<"ul">) => <ul className={cn(baseText, "my-3 ml-5 list-disc space-y-1.5", className)} {...props} />,

  ol: ({ className, ...props }: ComponentPropsWithoutRef<"ol">) => <ol className={cn(baseText, "my-3 ml-5 list-decimal space-y-1.5", className)} {...props} />,

  li: ({ className, ...props }: ComponentPropsWithoutRef<"li">) => <li className={cn("marker:text-muted-foreground", className)} {...props} />,

  code: ({ className, ...props }: ComponentPropsWithoutRef<"code">) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={cn("font-mono text-[0.85em]", className)} {...props} />;
    }
    return <code className={cn("rounded-md border border-border/60 bg-muted px-1.5 py-0.5", "align-[0.03em] font-mono text-[0.8em]", "text-foreground/90", className)} {...props} />;
  },

  pre: (props: ComponentPropsWithoutRef<"pre">) => <CodeBlock {...props} />,

  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<"blockquote">) => <blockquote className={cn(baseText, "mt-6 border-l-2 border-primary/60", "rounded-r-xl bg-muted/40 px-4 py-3", "text-muted-foreground", "shadow-[0_12px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)]", className)} {...props} />,

  hr: ({ className, ...props }: ComponentPropsWithoutRef<"hr">) => <hr className={cn("my-10 border-border/70", "border-t", className)} {...props} />,

  table: ({ className, ...props }: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-xs md:text-sm", "rounded-xl border border-border/60 bg-card/80 backdrop-blur-lg", "shadow-[0_0_24px_rgba(15,23,42,0.08)] dark:shadow-[0_0_24px_rgba(0,0,0,0.7)]", className)} {...props} />
    </div>
  ),

  thead: ({ className, ...props }: ComponentPropsWithoutRef<"thead">) => <thead className={cn("bg-muted/60 text-[0.7rem] tracking-[0.12em] text-muted-foreground uppercase md:text-[0.75rem]", className)} {...props} />,

  th: ({ className, ...props }: ComponentPropsWithoutRef<"th">) => <th className={cn("border-b border-border/60 px-3 py-2 font-medium", className)} {...props} />,

  td: ({ className, ...props }: ComponentPropsWithoutRef<"td">) => <td className={cn("border-t border-border/40 px-3 py-2 align-top", className)} {...props} />,

  // eslint-disable-next-line
  img: ({ className, ...props }: ComponentPropsWithoutRef<"img">) => <img className={cn("my-6 max-h-[420px] w-full max-w-full rounded-2xl border border-border/60", "bg-muted/30 object-contain", "shadow-[0_18px_60px_rgba(15,23,42,0.25)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.9)]", className)} {...props} />,

  div: ({ className, ...props }: ComponentPropsWithoutRef<"div">) => <div className={cn("relative", className)} {...props} />,

  InstallTabs,
  Callout,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
