import { ArrowRight, CircleAlert, FlaskConical } from 'lucide-react';
import { useModel } from '@firsttx/local-first';
import { Link } from 'react-router';
import {
  DispositionBadge,
  MetricKindBadge,
  PlaygroundHeader,
} from '@/components/playground/playground-shell';
import { playgroundScenarioContracts } from '@/data/playground-contract';
import { useI18n } from '@/hooks/use-i18n';
import type { MetricArtifactStatus, MetricLoadIssue } from '@/lib/metric-artifact';
import { PlaygroundMetricsModel } from '@/models/metrics.model';

const labCopy = {
  en: {
    index: 'Scenario criteria / confirmed 2026.07.19',
    title: 'Contracts and release criteria by scenario',
    description:
      'Review the source, environment, freshness, and test owner together with the scenario classification.',
    feed: 'Artifact feed',
    feedValue: 'GitHub Pages manifest',
    source: 'Source revision',
    sourceValue: 'Not published',
    freshness: 'Freshness',
    freshnessValue: 'Unavailable until metrics are connected',
    environment: 'Environment',
    environmentValue: 'Not published',
    gate: 'Release gate',
    gateValue: 'scenarios reported',
    disclosure: 'Unreported scenarios remain not measured and never receive fallback values.',
    owner: 'Test owner',
    release: 'Release condition',
    open: 'Run scenario',
    metric: 'Metric kinds',
    result: 'Runtime result',
    lastSuccess: 'Last successful run',
    lastSuccessValue: 'None published',
    status: {
      passed: 'Passed',
      failed: 'Failed',
      'expected-limitation': 'Expected limitation',
      'not-measured': 'Not measured',
      stale: 'Stale',
      unsupported: 'Unsupported',
    },
    issue: {
      'feed-unavailable': 'Feed unavailable',
      'invalid-manifest': 'Invalid manifest',
      'artifact-unavailable': 'Artifact unavailable',
      'invalid-artifact': 'Invalid artifact',
      'dirty-source': 'Artifact source was dirty',
      'source-unavailable': 'App source unknown',
      'source-mismatch': 'Source mismatch',
      expired: 'Artifact expired',
      unreported: 'No artifact published',
    },
  },
  ko: {
    index: '시나리오 기준 / 2026.07.19 확정',
    title: '시나리오별 계약과 공개 조건',
    description: '시나리오 분류와 함께 소스, 실행 환경, 측정 시각, 담당 테스트를 확인합니다.',
    feed: '측정 결과',
    feedValue: 'GitHub Pages manifest',
    source: '소스 버전',
    sourceValue: '게시 안 됨',
    freshness: '측정 시각',
    freshnessValue: '측정값 연결 전 확인 불가',
    environment: '실행 환경',
    environmentValue: '게시 안 됨',
    gate: '공개 기준',
    gateValue: '개 시나리오 게시됨',
    disclosure: '게시되지 않은 시나리오는 측정 안 됨으로 유지하며 대체 성공값을 표시하지 않습니다.',
    owner: '담당 테스트',
    release: '공개 조건',
    open: '시나리오 실행',
    metric: '측정값 분류',
    result: '실행 결과',
    lastSuccess: '마지막 성공 run',
    lastSuccessValue: '게시 이력 없음',
    status: {
      passed: '통과',
      failed: '실패',
      'expected-limitation': '알려진 한계',
      'not-measured': '측정 안 됨',
      stale: '만료됨',
      unsupported: '지원 안 됨',
    },
    issue: {
      'feed-unavailable': '결과 주소에 연결할 수 없음',
      'invalid-manifest': 'manifest 형식 오류',
      'artifact-unavailable': 'artifact를 불러올 수 없음',
      'invalid-artifact': 'artifact 형식 오류',
      'dirty-source': 'dirty source에서 생성됨',
      'source-unavailable': '앱 소스 버전 확인 불가',
      'source-mismatch': '앱과 artifact 소스 불일치',
      expired: 'artifact 유효 기간 만료',
      unreported: '게시된 artifact 없음',
    },
  },
} as const;

export default function VerificationLabPage() {
  const { locale } = useI18n();
  const { data } = useModel(PlaygroundMetricsModel);
  const copy = labCopy[locale];
  const scenarios = data?.scenarios ?? {};
  const reportedScenarios = Object.values(scenarios).filter((scenario) => scenario.artifact);
  const latestArtifact = reportedScenarios
    .map((scenario) => scenario.artifact)
    .filter((artifact) => artifact !== null)
    .sort((left, right) => Date.parse(right.measuredAt) - Date.parse(left.measuredAt))[0];
  const sourceValue = latestArtifact
    ? `${latestArtifact.source.commitSha.slice(0, 7)} · build ${latestArtifact.build.fingerprint.slice(0, 7)}${latestArtifact.source.dirty ? ' · dirty' : ''}`
    : copy.sourceValue;
  const freshnessValue = latestArtifact
    ? new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(latestArtifact.measuredAt))
    : copy.freshnessValue;
  const environmentValue = latestArtifact
    ? `${latestArtifact.environment.browser} · ${latestArtifact.environment.os} · ${latestArtifact.environment.viewport.width}×${latestArtifact.environment.viewport.height}`
    : copy.environmentValue;

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
            <strong>{sourceValue}</strong>
          </div>
          <div>
            <span>{copy.freshness}</span>
            <strong>{freshnessValue}</strong>
          </div>
          <div>
            <span>{copy.environment}</span>
            <strong>{environmentValue}</strong>
          </div>
          <div>
            <span>{copy.gate}</span>
            <strong>
              {locale === 'ko'
                ? `${reportedScenarios.length}/${playgroundScenarioContracts.length}${copy.gateValue}`
                : `${reportedScenarios.length}/${playgroundScenarioContracts.length} ${copy.gateValue}`}
            </strong>
          </div>
        </section>
        <div className="atlas-lab-disclosure">
          <CircleAlert aria-hidden="true" />
          <p>{copy.disclosure}</p>
        </div>
        <section className="atlas-ledger" aria-label="Scenario contract ledger">
          {playgroundScenarioContracts.map((scenario, index) => {
            const runtime = scenarios[scenario.id];
            const status: MetricArtifactStatus = runtime?.status ?? 'not-measured';
            const issue: MetricLoadIssue | null = runtime ? runtime.issue : 'unreported';
            return (
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
                  <span className="atlas-runtime-status" data-status={status}>
                    <i aria-hidden="true" />
                    {copy.result}: {copy.status[status]}
                    {issue ? ` · ${copy.issue[issue]}` : ''}
                  </span>
                  <span className="atlas-last-success">
                    {copy.lastSuccess}:{' '}
                    <code>
                      {runtime?.artifact?.lastSuccessfulRunId?.slice(0, 19) ??
                        copy.lastSuccessValue}
                    </code>
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
            );
          })}
        </section>
        <section className="atlas-lab-endnote">
          <FlaskConical aria-hidden="true" />
          <p>{copy.disclosure}</p>
        </section>
      </main>
    </div>
  );
}
