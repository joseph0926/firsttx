import { ArrowRight, FlaskConical, Play, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { PlaygroundHeader, DispositionBadge } from '@/components/playground/playground-shell';
import { playgroundScenarioContracts, type PlaygroundPackage } from '@/data/playground-contract';
import { useI18n } from '@/hooks/use-i18n';

const packageLabels: Record<PlaygroundPackage, string> = {
  prepaint: 'Prepaint',
  'local-first': 'Local-First',
  tx: 'Tx',
};

const homeCopy = {
  en: {
    kicker: 'Run a scenario, then inspect its contract.',
    title: 'Try the behavior.\nCheck the contract.',
    description:
      'Use the demo first, then review the supported behavior, test owner, and release condition behind it.',
    tour: 'Take the guided tour',
    lab: 'View verification criteria',
    scenarioCount: 'scenarios',
    coverSummary: '5 current contracts · 2 limitations · 2 rewrites',
    releasePosture: 'Scenario classification',
    currentContracts: 'Matches current behavior',
    limitations: 'Known limitations',
    rewrites: 'Demo update required',
    allContracts: 'View all criteria',
    chapterKicker: 'Package scenarios',
    chapterTitle: 'Explore each package by role and support boundary.',
    packageSummary: {
      prepaint: 'Show a stored visual snapshot until React commits the current screen.',
      'local-first': 'Read cached data first, then revalidate it according to the selected policy.',
      tx: 'Apply retry and reverse-order compensation to optimistic steps.',
    },
    scenario: 'scenario',
    scenarios: 'scenarios',
    inspect: 'View criteria',
    footerTitle: 'Run the scenario and check what is supported.',
    footerDescription:
      'Correctness checks, benchmarks, and known limitations are shown separately.',
  },
  ko: {
    kicker: '시나리오를 실행한 뒤 계약을 확인하세요.',
    title: '기능을 실행하고,\n지원 범위를 확인하세요.',
    description:
      '데모를 먼저 사용해 보고, 같은 화면에서 지원하는 동작과 테스트 기준을 확인할 수 있습니다.',
    tour: '둘러보기',
    lab: '검증 기준 보기',
    scenarioCount: '개 시나리오',
    coverSummary: '현재 동작 5 · 알려진 한계 2 · 데모 수정 필요 2',
    releasePosture: '시나리오 분류',
    currentContracts: '현재 동작과 일치',
    limitations: '현재 지원하지 않는 동작',
    rewrites: '시나리오 구현 보완',
    allContracts: '전체 기준 보기',
    chapterKicker: '패키지별 시나리오',
    chapterTitle: '세 패키지의 역할과 지원 범위를 나누어 살펴봅니다.',
    packageSummary: {
      prepaint: '저장해 둔 화면을 먼저 보여 주고 React가 그린 현재 화면으로 전환합니다.',
      'local-first': '저장된 데이터를 먼저 읽고 설정한 기준에 따라 서버 데이터로 갱신합니다.',
      tx: '낙관적 작업에 재시도와 역순 보상 처리를 적용합니다.',
    },
    scenario: '개 시나리오',
    scenarios: '개 시나리오',
    inspect: '기준 보기',
    footerTitle: '필요한 시나리오를 실행하고 지원 범위를 확인하세요.',
    footerDescription: '정확성 검사, 성능 측정값, 알려진 한계를 서로 구분해 표시합니다.',
  },
} as const;

export default function HomePage() {
  const { locale } = useI18n();
  const copy = homeCopy[locale];

  const packageOrder: PlaygroundPackage[] = ['prepaint', 'local-first', 'tx'];
  const dispositionCounts = playgroundScenarioContracts.reduce(
    (counts, scenario) => ({ ...counts, [scenario.disposition]: counts[scenario.disposition] + 1 }),
    {
      'current-contract': 0,
      'expected-limitation': 0,
      'demo-rewrite': 0,
      'package-fix-first': 0,
      'remove-until-supported': 0,
    },
  );

  return (
    <div className="atlas-site-shell">
      <PlaygroundHeader />
      <main className="atlas-home-main">
        <section className="atlas-home-hero">
          <div>
            <p className="atlas-kicker">
              <Sparkles aria-hidden="true" />
              {copy.kicker}
            </p>
            <h1>{copy.title}</h1>
            <p className="atlas-hero-description">{copy.description}</p>
            <div className="atlas-actions">
              <Link className="atlas-button atlas-button-primary" to="/tour/problem">
                <Play aria-hidden="true" />
                {copy.tour}
              </Link>
              <Link className="atlas-button atlas-button-secondary" to="/lab">
                <FlaskConical aria-hidden="true" />
                {copy.lab}
              </Link>
            </div>
          </div>
          <div
            className="atlas-cover"
            aria-label={`${playgroundScenarioContracts.length} scenarios`}
          >
            <span className="atlas-cover-index">01—09</span>
            <div className="atlas-cover-orbit" aria-hidden="true">
              <span>Prepaint</span>
              <span>Local-First</span>
              <span>Tx</span>
            </div>
            <strong>{playgroundScenarioContracts.length}</strong>
            <p>{copy.scenarioCount}</p>
            <small>{copy.coverSummary}</small>
          </div>
        </section>
        <section className="atlas-proof-strip" aria-label={copy.releasePosture}>
          <span>{copy.releasePosture}</span>
          <article>
            <DispositionBadge disposition="current-contract" locale={locale} />
            <strong>{copy.currentContracts}</strong>
            <small>{dispositionCounts['current-contract']} / 9</small>
          </article>
          <article>
            <DispositionBadge disposition="expected-limitation" locale={locale} />
            <strong>{copy.limitations}</strong>
            <small>{dispositionCounts['expected-limitation']} / 9</small>
          </article>
          <article>
            <DispositionBadge disposition="demo-rewrite" locale={locale} />
            <strong>{copy.rewrites}</strong>
            <small>{dispositionCounts['demo-rewrite']} / 9</small>
          </article>
          <Link to="/lab">
            {copy.allContracts}
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
        <section className="atlas-chapters">
          <div className="atlas-section-title">
            <span>{copy.chapterKicker}</span>
            <h2>{copy.chapterTitle}</h2>
          </div>
          {packageOrder.map((packageId, index) => {
            const scenarios = playgroundScenarioContracts.filter(
              (scenario) => scenario.packages[0] === packageId,
            );
            return (
              <article className="atlas-chapter" key={packageId} data-package={packageId}>
                <span className="atlas-chapter-number">0{index + 1}</span>
                <div className="atlas-chapter-copy">
                  <span>{packageLabels[packageId]}</span>
                  <h3>{copy.packageSummary[packageId]}</h3>
                  <p>
                    {locale === 'ko'
                      ? `${scenarios.length}개 시나리오`
                      : `${scenarios.length} ${
                          scenarios.length === 1 ? copy.scenario : copy.scenarios
                        }`}
                  </p>
                </div>
                <div className="atlas-chapter-cards">
                  {scenarios.map((scenario) => (
                    <Link key={scenario.id} to={scenario.route}>
                      <DispositionBadge disposition={scenario.disposition} locale={locale} />
                      <strong>{scenario.title}</strong>
                      <small>{scenario.userJob}</small>
                      <span>
                        {copy.inspect}
                        <ArrowRight aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
        <section className="atlas-home-footer-cta">
          <p>FirstTx / Playground</p>
          <h2>{copy.footerTitle}</h2>
          <span>{copy.footerDescription}</span>
          <Link className="atlas-button atlas-button-primary" to="/lab">
            <FlaskConical aria-hidden="true" />
            {copy.lab}
          </Link>
        </section>
      </main>
    </div>
  );
}
