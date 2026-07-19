import { BookOpen, FlaskConical, Moon, Play, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTheme } from '@/components/theme-provider';
import { useI18n, type Locale } from '@/hooks/use-i18n';
import type {
  MetricKind,
  PlaygroundScenarioContract,
  ScenarioDisposition,
} from '@/data/playground-contract';

const shellCopy = {
  en: {
    overview: 'Overview',
    lab: 'Verification lab',
    tour: 'Guided tour',
    docs: 'Documentation',
    lightTheme: 'Use light theme',
    darkTheme: 'Use dark theme',
    disposition: {
      'current-contract': 'Current contract',
      'expected-limitation': 'Expected limitation',
      'demo-rewrite': 'Demo rewrite',
      'package-fix-first': 'Package fix first',
      'remove-until-supported': 'Not published',
    },
    metric: {
      contract: 'Contract',
      benchmark: 'Benchmark',
      'expected-limitation': 'Limitation',
    },
    source: 'Source',
    sourceValue: 'Not published',
    freshness: 'Freshness',
    freshnessValue: 'No runtime artifact',
    environment: 'Environment',
    environmentValue: 'Defined by test owner',
    owner: 'Test owner',
    release: 'Public release condition',
    run: 'Run scenario',
  },
  ko: {
    overview: '홈',
    lab: '검증 기준',
    tour: '둘러보기',
    docs: '제품 문서',
    lightTheme: '라이트 테마 사용',
    darkTheme: '다크 테마 사용',
    disposition: {
      'current-contract': '현재 계약',
      'expected-limitation': '알려진 한계',
      'demo-rewrite': '데모 수정 필요',
      'package-fix-first': '패키지 수정 우선',
      'remove-until-supported': '공개 보류',
    },
    metric: {
      contract: '계약',
      benchmark: '벤치마크',
      'expected-limitation': '한계',
    },
    source: '소스',
    sourceValue: '게시 안 됨',
    freshness: '측정 시각',
    freshnessValue: '실행 결과 없음',
    environment: '실행 환경',
    environmentValue: '담당 테스트에서 정의',
    owner: '담당 테스트',
    release: '공개 조건',
    run: '시나리오 실행',
  },
} as const;

export function PlaygroundHeader() {
  const location = useLocation();
  const { locale, getDocsUrl } = useI18n();
  const { theme, setTheme } = useTheme();
  const copy = shellCopy[locale];
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="atlas-header">
      <Link className="atlas-brand" to="/" aria-label="FirstTx Playground">
        <span className="atlas-brand-mark">FT</span>
        <span>
          <strong>FirstTx</strong>
          <small>Playground</small>
        </span>
      </Link>
      <nav className="atlas-navigation" aria-label="Playground">
        <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined}>
          {copy.overview}
        </Link>
        <Link to="/lab" aria-current={location.pathname === '/lab' ? 'page' : undefined}>
          <FlaskConical aria-hidden="true" />
          {copy.lab}
        </Link>
        <Link
          to="/tour/problem"
          aria-current={location.pathname.startsWith('/tour') ? 'page' : undefined}
        >
          <Play aria-hidden="true" />
          {copy.tour}
        </Link>
      </nav>
      <div className="atlas-header-tools">
        <a href={getDocsUrl()} target="_blank" rel="noreferrer" className="atlas-docs-link">
          <BookOpen aria-hidden="true" />
          <span>{copy.docs}</span>
        </a>
        <LanguageSwitcher className="atlas-language-switch" />
        <button
          type="button"
          className="atlas-theme-toggle"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? copy.lightTheme : copy.darkTheme}
        >
          {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

export function DispositionBadge({
  disposition,
  locale,
}: {
  disposition: ScenarioDisposition;
  locale: Locale;
}) {
  return (
    <span className="atlas-status-badge" data-disposition={disposition}>
      <span aria-hidden="true" />
      {shellCopy[locale].disposition[disposition]}
    </span>
  );
}

export function MetricKindBadge({ kind, locale }: { kind: MetricKind; locale: Locale }) {
  return <span className="atlas-kind-badge">{shellCopy[locale].metric[kind]}</span>;
}

export function ContractReceipt({ scenario }: { scenario: PlaygroundScenarioContract }) {
  const { locale } = useI18n();
  const copy = shellCopy[locale];

  return (
    <aside className="atlas-contract-receipt" aria-label={`${scenario.title} contract`}>
      <div className="atlas-receipt-status">
        <DispositionBadge disposition={scenario.disposition} locale={locale} />
        <div>
          {scenario.metricKinds.map((kind) => (
            <MetricKindBadge key={kind} kind={kind} locale={locale} />
          ))}
        </div>
      </div>
      <dl>
        <div>
          <dt>{copy.source}</dt>
          <dd>{copy.sourceValue}</dd>
        </div>
        <div>
          <dt>{copy.freshness}</dt>
          <dd>{copy.freshnessValue}</dd>
        </div>
        <div>
          <dt>{copy.environment}</dt>
          <dd>{copy.environmentValue}</dd>
        </div>
        <div>
          <dt>{copy.owner}</dt>
          <dd>{scenario.testOwner}</dd>
        </div>
      </dl>
      <div className="atlas-release-condition">
        <span>{copy.release}</span>
        <p>{scenario.releaseCondition}</p>
      </div>
    </aside>
  );
}
