"use client";

import { useRef } from "react";
import { Navbar } from "./layout/navbar";
import { BackgroundGlow } from "./layout/background-glow";
import { Footer } from "./layout/footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="relative h-screen min-h-screen w-full overflow-y-auto">
      <Navbar scrollContainerRef={scrollRef} />
      <BackgroundGlow />
      {children}
      <div className="relative mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
