import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { GitHubIcon } from "../ui/icons";
import Image from "next/image";

export function LandingNavbar() {
  return (
    <nav className="sticky top-4 z-20 mb-10 flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-xs backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-xl shadow-md shadow-primary/40">
          <Image src="/logo/firsttx_logo.png" alt="logo" width={48} height={48} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">FirstTx</span>
          <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Prepaint · Local-First · Tx</span>
        </div>
      </div>
      <div className="hidden items-center gap-6 text-[11px] font-medium text-muted-foreground sm:flex">
        <a href="#layers" className="transition-colors hover:text-foreground">
          Product
        </a>
        <a href="#quickstart" className="transition-colors hover:text-foreground">
          Quickstart
        </a>
        <a href="https://firsttx-playground.vercel.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          Playground
          <ExternalLink className="size-3" />
        </a>
        <a href="https://github.com/joseph0926/firsttx" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          <GitHubIcon />
          GitHub
        </a>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/" className="hidden rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground/90 hover:bg-secondary/60 sm:inline-flex">
          Docs Home
        </Link>
        <a href="#quickstart" className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-xl">
          빠르게 시작하기
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </a>
      </div>
    </nav>
  );
}
