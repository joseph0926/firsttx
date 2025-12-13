import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Clock, Gauge } from 'lucide-react';
import { type PackageType, PackageBadgeGroup } from './package-badge';
import { ProblemSolution } from './problem-solution';
import { CodePreview } from './code-preview';
import { NextSteps } from './next-steps';
import { cn } from '@/lib/utils';

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
  1: { label: 'Beginner', color: 'text-green-400' },
  2: { label: 'Intermediate', color: 'text-yellow-400' },
  3: { label: 'Advanced', color: 'text-red-400' },
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
  const diffConfig = difficultyConfig[difficulty];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Arena
              </Link>
              <div className="h-4 w-px bg-border" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground terminal-text">LEVEL {level}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className={cn('text-xs font-medium', diffConfig.color)}>
                    {diffConfig.label}
                  </span>
                </div>
                <h1 className="text-lg font-semibold">{title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <PackageBadgeGroup packages={packages} />
              <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  <span>Level {difficulty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {description && <p className="mb-6 text-lg text-muted-foreground">{description}</p>}

        <section className="mb-8">
          <ProblemSolution
            problem={problem}
            solution={solution}
            problemDetails={problemDetails}
            solutionDetails={solutionDetails}
          />
        </section>

        {codeSnippet && (
          <section className="mb-8">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Code Behind This Demo
            </h2>
            <CodePreview
              code={codeSnippet}
              title={codeTitle}
              collapsible
              defaultCollapsed={false}
            />
          </section>
        )}

        <section className="mb-12">{children}</section>

        {(relatedDemos || docsLink) && (
          <section className="border-t border-border pt-8">
            <NextSteps
              relatedDemos={relatedDemos}
              docsLink={docsLink}
              currentPackage={packages[0]}
            />
          </section>
        )}
      </div>
    </div>
  );
}

export { MetricCard, MetricsGrid, SectionHeader } from '../scenario-layout';
