import type { ReactNode } from 'react';
import { ArrowLeft, Clock, Gauge } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { type PackageType, PackageBadgeGroup } from './package-badge';
import { ProblemSolution } from './problem-solution';
import { CodePreview } from './code-preview';
import { NextSteps } from './next-steps';
import { cn } from '@/lib/utils';
import { ContractReceipt, PlaygroundHeader } from '@/components/playground/playground-shell';
import { playgroundScenarioContracts } from '@/data/playground-contract';
import { useI18n } from '@/hooks/use-i18n';

interface DemoLayoutProps {
  level: 1 | 2 | 3;
  title: string;
  description?: string;
  packages: PackageType[];
  difficulty: 1 | 2 | 3;
  duration: string;
  problem: string;
  solution: string;
  problemDetails?: string[];
  solutionDetails?: string[];
  codeSnippet?: string;
  codeTitle?: string;
  relatedDemos?: {
    id: string;
    title: string;
    path: string;
    package: PackageType;
  }[];
  docsLink?: string;
  children: ReactNode;
}

const difficultyConfig = {
  1: { label: 'Beginner', className: 'is-beginner' },
  2: { label: 'Intermediate', className: 'is-intermediate' },
  3: { label: 'Advanced', className: 'is-advanced' },
};

export function DemoLayout({
  level,
  title,
  description,
  packages,
  difficulty,
  duration,
  problem,
  solution,
  problemDetails,
  solutionDetails,
  codeSnippet,
  codeTitle,
  relatedDemos,
  docsLink,
  children,
}: DemoLayoutProps) {
  const location = useLocation();
  const { locale } = useI18n();
  const diffConfig = difficultyConfig[difficulty];
  const scenario = playgroundScenarioContracts.find(
    (candidate) => candidate.route === location.pathname,
  );
  const copy =
    locale === 'ko'
      ? {
          back: '전체 시나리오',
          level: '장',
          behind: '데모 코드',
          workspace: '실행 영역',
          contract: '시나리오 계약',
        }
      : {
          back: 'All scenarios',
          level: 'Chapter',
          behind: 'Demo code',
          workspace: 'Run the scenario',
          contract: 'Scenario contract',
        };

  return (
    <div className="atlas-site-shell atlas-demo-page">
      <PlaygroundHeader />
      <main className="atlas-demo-main">
        <Link to="/" className="atlas-back-link">
          <ArrowLeft aria-hidden="true" />
          {copy.back}
        </Link>
        <section className="atlas-demo-title">
          <div>
            <span>
              {copy.level} {level} / {packages.join(' + ')}
            </span>
            <h1>{title}</h1>
          </div>
          <div className="atlas-demo-meta">
            <PackageBadgeGroup packages={packages} />
            <dl>
              <div>
                <Clock aria-hidden="true" />
                <dt>{duration}</dt>
              </div>
              <div className={cn('atlas-difficulty', diffConfig.className)}>
                <Gauge aria-hidden="true" />
                <dt>{diffConfig.label}</dt>
              </div>
            </dl>
          </div>
          {description && <p>{description}</p>}
        </section>
        {scenario && (
          <section className="atlas-contract-section">
            <div className="atlas-section-label">{copy.contract}</div>
            <ContractReceipt scenario={scenario} />
          </section>
        )}
        <section className="atlas-problem-section">
          <ProblemSolution
            problem={problem}
            solution={solution}
            problemDetails={problemDetails}
            solutionDetails={solutionDetails}
          />
        </section>
        {codeSnippet && (
          <section className="atlas-code-section">
            <h2>{copy.behind}</h2>
            <CodePreview
              code={codeSnippet}
              title={codeTitle}
              collapsible
              defaultCollapsed={false}
            />
          </section>
        )}
        <section className="atlas-demo-workspace">
          <div className="atlas-section-label">{copy.workspace}</div>
          {children}
        </section>
        {(relatedDemos || docsLink) && (
          <section className="atlas-next-section">
            <NextSteps
              relatedDemos={relatedDemos}
              docsLink={docsLink}
              currentPackage={packages[0]}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export { MetricCard, MetricsGrid, SectionHeader } from '../scenario-layout';
