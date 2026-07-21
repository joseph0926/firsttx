import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SetupSelector } from "@/components/setup-selector";

type Locale = "ko" | "en";

const PLAYGROUND_URL = "https://firsttx-playground.vercel.app";

const copy = {
  ko: {
    eyebrow: "React CSR용 클라이언트 툴킷",
    title: "필요한 레이어만 선택하세요.",
    body: "Prepaint는 재방문 화면을 복원하고, Local-First는 클라이언트 상태를 유지하며, Tx는 실패한 낙관적 작업을 보상합니다. 각 패키지는 독립적으로 사용할 수 있고 Playground에서 동작을 확인할 수 있습니다.",
    chooseAction: "도입 구성 선택",
    referenceAction: "API 레퍼런스 보기",
    chooseTitle: "먼저 해결할 문제를 선택하세요",
    chooseBody: "문제를 선택하면 필요한 패키지, 설치 명령, Playground 시나리오가 바뀝니다.",
    fit: "이런 팀에 맞습니다",
    fitBody: "Vite·SPA·내부 도구에서 CSR을 유지하며 재방문 경험, IndexedDB 상태, 보상 가능한 트랜잭션을 선택적으로 도입하려는 팀",
    notFit: "이런 문제는 해결하지 않습니다",
    notFitBody: "서버 데이터베이스, 범용 충돌 해결, SSR 프레임워크 또는 완전한 오프라인 동기화",
    proof: "문서를 읽은 뒤 행동으로 확인하세요",
    proofBody: "Docs는 계약을 설명하고, Playground는 동작을 재현하며, DevTools는 런타임 이벤트를 보여줍니다.",
    proofAction: "Playground에서 재현",
  },
  en: {
    eyebrow: "A client toolkit for React CSR",
    title: "Choose only the client layer you need.",
    body: "Prepaint restores the revisit view, Local-First persists client state, and Tx compensates failed optimistic work. Each package works independently and can be verified in Playground.",
    chooseAction: "Choose a setup",
    referenceAction: "View API reference",
    chooseTitle: "Choose the problem to solve first",
    chooseBody: "Your choice updates the package, install command, and Playground scenario.",
    fit: "A good fit",
    fitBody: "Teams keeping CSR in Vite, SPAs, or internal tools while selectively adding revisit UX, IndexedDB state, or compensatable transactions",
    notFit: "Not a fit",
    notFitBody: "A server database, general conflict resolution, an SSR framework, or complete offline synchronization",
    proof: "Verify the behavior after reading the contract",
    proofBody: "Docs explain the contract, Playground reproduces behavior, and DevTools exposes runtime events.",
    proofAction: "Reproduce in Playground",
  },
} as const;

export function LandingRedesign({ locale }: { locale: Locale }) {
  const text = copy[locale];

  return (
    <main id="main-content" className="production-landing">
      <div className="production-landing-inner">
        <header className="production-hero">
          <p>{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <div className="production-hero-copy">{text.body}</div>
          <div className="production-hero-actions">
            <a href="#choose-setup">
              {text.chooseAction} <span aria-hidden="true">↓</span>
            </a>
            <Link href={`/${locale}/docs/reference`}>
              {text.referenceAction} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>
        <section id="choose-setup" className="production-setup" aria-labelledby="choose-setup-title">
          <div className="production-setup-intro">
            <h2 id="choose-setup-title">{text.chooseTitle}</h2>
            <p>{text.chooseBody}</p>
          </div>
          <SetupSelector locale={locale} />
        </section>
        <section className="production-boundaries">
          <article>
            <h2>{text.fit}</h2>
            <p>{text.fitBody}</p>
          </article>
          <article>
            <h2>{text.notFit}</h2>
            <p>{text.notFitBody}</p>
          </article>
          <article>
            <h2>{text.proof}</h2>
            <p>{text.proofBody}</p>
            <a href={PLAYGROUND_URL} target="_blank" rel="noreferrer">
              {text.proofAction} <ExternalLink aria-hidden="true" />
            </a>
          </article>
        </section>
      </div>
    </main>
  );
}
