"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Locale = "ko" | "en";
type SetupId = "prepaint" | "local-first" | "tx" | "full";

const PLAYGROUND_URL = "https://firsttx-playground.vercel.app";

const setupCopy = {
  ko: {
    selected: "선택한 구성",
    neutralLabel: "선택 전",
    neutralTitle: "해결할 문제를 선택하세요",
    neutralDescription: "선택하면 필요한 패키지, 설치 명령과 검증 경로를 여기에 표시합니다.",
    install: "설치",
    copy: "설치 명령 복사",
    copied: "복사됨",
    read: "문서 보기",
    verify: "Playground에서 재현",
    options: {
      prepaint: {
        problem: "재방문 때 빈 화면이 먼저 보입니다",
        name: "Prepaint",
        description: "마지막 화면 스냅샷을 React 렌더링 전에 비활성 오버레이로 복원",
      },
      "local-first": {
        problem: "새로고침 뒤 클라이언트 상태가 사라집니다",
        name: "Local-First",
        description: "IndexedDB 기반 캐시와 React 동기 스냅샷 제공",
      },
      tx: {
        problem: "낙관적 작업 실패를 안전하게 되돌려야 합니다",
        name: "Tx",
        description: "재시도·롤백·보상 경계를 명시",
      },
      full: {
        problem: "세 문제가 연결되어 있습니다",
        name: "Prepaint + Local-First + Tx",
        description: "재방문 화면, 지속 상태와 낙관적 작업을 한 도입 경로로 연결",
      },
    },
  },
  en: {
    selected: "Selected setup",
    neutralLabel: "No setup selected",
    neutralTitle: "Choose a problem to solve",
    neutralDescription: "Your package, install command, and verification path will appear here.",
    install: "Install",
    copy: "Copy install command",
    copied: "Copied",
    read: "Read the docs",
    verify: "Reproduce in Playground",
    options: {
      prepaint: {
        problem: "A blank screen appears first on revisit",
        name: "Prepaint",
        description: "Restore the last visual snapshot as a non-interactive overlay before React renders",
      },
      "local-first": {
        problem: "Client state disappears after refresh",
        name: "Local-First",
        description: "Provide an IndexedDB-backed cache and synchronous React snapshot",
      },
      tx: {
        problem: "Failed optimistic work needs a safe rollback",
        name: "Tx",
        description: "Make retry, rollback, and compensation boundaries explicit",
      },
      full: {
        problem: "The three problems are connected",
        name: "Prepaint + Local-First + Tx",
        description: "Connect revisit visuals, persistent state, and optimistic work in one adoption path",
      },
    },
  },
} as const;

const setups: Array<{
  id: SetupId;
  number: string;
  packages: string;
  docsPath: string;
  playgroundPath: string;
}> = [
  {
    id: "prepaint",
    number: "01",
    packages: "@firsttx/prepaint",
    docsPath: "/docs/prepaint",
    playgroundPath: "/prepaint/heavy",
  },
  {
    id: "local-first",
    number: "02",
    packages: "@firsttx/local-first zod",
    docsPath: "/docs/local-first",
    playgroundPath: "/sync/instant-cart",
  },
  {
    id: "tx",
    number: "03",
    packages: "@firsttx/tx",
    docsPath: "/docs/tx",
    playgroundPath: "/tx/rollback-chain",
  },
  {
    id: "full",
    number: "ALL",
    packages: "@firsttx/prepaint @firsttx/local-first @firsttx/tx zod",
    docsPath: "/docs/getting-started",
    playgroundPath: "/tour",
  },
];

export function SetupSelector({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const [selectedId, setSelectedId] = useState<SetupId | null>(null);
  const [copied, setCopied] = useState(false);
  const text = setupCopy[locale];
  const selected = setups.find((setup) => setup.id === selectedId);
  const selectedCopy = selected ? text.options[selected.id] : null;
  const command = selected ? `pnpm add ${selected.packages}` : "";

  async function copyCommand() {
    try {
      if (!command) return;
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("setup-selector", compact && "setup-selector-compact")}>
      <div className="setup-options" aria-label={locale === "ko" ? "해결할 문제 선택" : "Choose a problem to solve"}>
        {setups.map((setup) => {
          const option = text.options[setup.id];
          const selectedOption = selected?.id === setup.id;

          return (
            <button
              key={setup.id}
              type="button"
              className={cn("setup-option", selectedOption && "is-selected")}
              aria-pressed={selectedOption}
              onClick={() => {
                setSelectedId(setup.id);
                setCopied(false);
              }}
            >
              <span className="setup-number">{setup.number}</span>
              <span className="setup-option-copy">
                <strong>{option.problem}</strong>
                <small>{option.name}</small>
              </span>
              <span className="setup-arrow" aria-hidden="true">
                →
              </span>
            </button>
          );
        })}
      </div>
      <article className={cn("setup-result", !selected && "is-neutral")} aria-live="polite">
        <span className="setup-result-label">{selected ? text.selected : text.neutralLabel}</span>
        <div className="setup-result-title">
          <span className="setup-result-dot" aria-hidden="true" />
          <h3>{selectedCopy?.name ?? text.neutralTitle}</h3>
          {selected ? <code>{selected.id === "full" ? "combined" : `@firsttx/${selected.id}`}</code> : null}
        </div>
        <p>{selectedCopy?.description ?? text.neutralDescription}</p>
        {selected ? (
          <>
            <div className="setup-install">
              <div>
                <span>{text.install}</span>
                <code>{command}</code>
              </div>
              <button type="button" onClick={copyCommand} aria-label={text.copy}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                <span>{copied ? text.copied : text.copy}</span>
              </button>
            </div>
            <div className="setup-actions">
              <Link href={`/${locale}${selected.docsPath}`}>
                {text.read} <span aria-hidden="true">→</span>
              </Link>
              <a href={`${PLAYGROUND_URL}${selected.playgroundPath}`} target="_blank" rel="noreferrer">
                {text.verify} <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </>
        ) : (
          <div className="setup-neutral-line" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </article>
    </div>
  );
}
