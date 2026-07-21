"use client";

import { useRef } from "react";
import { Navbar } from "./layout/navbar";
import { Footer } from "./layout/footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div id="scroll-container" ref={scrollRef} className="relative h-screen min-h-screen w-full overflow-y-auto">
      <a href="#main-content" className="skip-link">
        <span className="locale-en">Skip to content</span>
        <span className="locale-ko">본문으로 건너뛰기</span>
      </a>
      <Navbar />
      {children}
      <div className="relative mx-auto w-full max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
