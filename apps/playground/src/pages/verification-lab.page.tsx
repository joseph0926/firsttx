import { ArrowRight, CircleAlert, FlaskConical } from 'lucide-react';
import { Link } from 'react-router';
import {
  DispositionBadge,
  MetricKindBadge,
  PlaygroundHeader,
} from '@/components/playground/playground-shell';
import { playgroundScenarioContracts } from '@/data/playground-contract';
import { useI18n } from '@/hooks/use-i18n';

const labCopy = {
  en: {
    index: 'Scenario criteria / confirmed 2026.07.19',
    title: 'Contracts and release criteria by scenario',
    description:
      'Review the source, environment, freshness, and test owner together with the scenario classification.',
    feed: 'Artifact feed',
    feedValue: 'Not connected',
    source: 'Source revision',
    sourceValue: 'Not published',
    freshness: 'Freshness',
    freshnessValue: 'Unavailable until metrics are connected',
    gate: 'Release gate',
    gateValue: 'Contract registry connected',
    disclosure:
      'Runtime metrics are not connected yet, so this page does not show fallback values.',
    owner: 'Test owner',
    release: 'Release condition',
    open: 'Run scenario',
    metric: 'Metric kinds',
  },
  ko: {
    index: '시나리오 기준 / 2026.07.19 확정',
    title: '시나리오별 계약과 공개 조건',
    description: '시나리오 분류와 함께 소스, 실행 환경, 측정 시각, 담당 테스트를 확인합니다.',
    feed: '측정 결과',
    feedValue: '연결 안 됨',
    source: '소스 버전',
    sourceValue: '게시 안 됨',
    freshness: '측정 시각',
    freshnessValue: '측정값 연결 전 확인 불가',
    gate: '공개 기준',
    gateValue: '계약 정보만 연결됨',
    disclosure: '실행 결과가 아직 연결되지 않아 임의의 성공 수치를 표시하지 않습니다.',
    owner: '담당 테스트',
    release: '공개 조건',
    open: '시나리오 실행',
    metric: '측정값 분류',
  },
} as const;

export default function VerificationLabPage() {
  const { locale } = useI18n();
  const copy = labCopy[locale];

  return (
    <div className="atlas-site-shell">
      <PlaygroundHeader />
      <main className="atlas-lab-main">
        <section className="atlas-lab-title">
          <span>{copy.index}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </section>
        <section className="atlas-lab-toolbar" aria-label="Verification provenance">
          <div>
            <span>{copy.feed}</span>
            <strong>{copy.feedValue}</strong>
          </div>
          <div>
            <span>{copy.source}</span>
            <strong>{copy.sourceValue}</strong>
          </div>
          <div>
            <span>{copy.freshness}</span>
            <strong>{copy.freshnessValue}</strong>
          </div>
          <div>
            <span>{copy.gate}</span>
            <strong>{copy.gateValue}</strong>
          </div>
        </section>
        <div className="atlas-lab-disclosure">
          <CircleAlert aria-hidden="true" />
          <p>{copy.disclosure}</p>
        </div>
        <section className="atlas-ledger" aria-label="Scenario contract ledger">
          {playgroundScenarioContracts.map((scenario, index) => (
            <article key={scenario.id}>
              <span className="atlas-ledger-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="atlas-ledger-main">
                <p>{scenario.packages.join(' + ')}</p>
                <h2>{scenario.title}</h2>
                <small>{scenario.route}</small>
              </div>
              <div className="atlas-ledger-contract">
                <DispositionBadge disposition={scenario.disposition} locale={locale} />
                <strong>{scenario.contract}</strong>
                <span>
                  {copy.metric}
                  {scenario.metricKinds.map((kind) => (
                    <MetricKindBadge key={kind} kind={kind} locale={locale} />
                  ))}
                </span>
              </div>
              <div className="atlas-ledger-owner">
                <span>{copy.owner}</span>
                <code>{scenario.testOwner}</code>
                <span>{copy.release}</span>
                <small>{scenario.releaseCondition}</small>
              </div>
              <Link to={scenario.route} aria-label={`${scenario.title} ${copy.open}`}>
                <ArrowRight aria-hidden="true" />
              </Link>
            </article>
          ))}
        </section>
        <section className="atlas-lab-endnote">
          <FlaskConical aria-hidden="true" />
          <p>{copy.disclosure}</p>
        </section>
      </main>
    </div>
  );
}
