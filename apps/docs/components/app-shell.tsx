"use client";

import { useRef } from "react";
import { Navbar } from "./layout/navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="relative h-screen min-h-screen w-full overflow-y-auto">
      <Navbar scrollContainerRef={scrollRef} />
      {children}
    </div>
  );
}
