import { Link } from 'react-router';
import { ArrowRight, BookOpen, Play, ExternalLink } from 'lucide-react';
import { type PackageType, PackageBadge } from './package-badge';
import { cn } from '@/lib/utils';

interface NextStepsProps {
  relatedDemos?: {
    id: string;
    title: string;
    path: string;
    package: PackageType;
  }[];
  docsLink?: string;
  currentPackage: PackageType;
}

export function NextSteps({ relatedDemos, docsLink, currentPackage }: NextStepsProps) {
  const hasRelatedDemos = relatedDemos && relatedDemos.length > 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-200">Next Steps</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {docsLink && (
          <a
            href={docsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium text-zinc-200">Read Documentation</span>
                <ExternalLink className="h-3 w-3 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500">
                Learn the full API and advanced patterns for {currentPackage}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-400" />
          </a>
        )}
        {hasRelatedDemos &&
          relatedDemos.map((demo) => (
            <Link
              key={demo.id}
              to={demo.path}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <Play className="h-5 w-5 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 font-medium text-zinc-200">{demo.title}</div>
                <PackageBadge package={demo.package} size="sm" showLabel={false} />
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-400" />
            </Link>
          ))}
      </div>
    </div>
  );
}

interface LearningPathProps {
  steps: {
    number: number;
    title: string;
    description: string;
    path: string;
    completed?: boolean;
    current?: boolean;
  }[];
}

export function LearningPath({ steps }: LearningPathProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-200">Learning Path</h3>
      <div className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.number}
            to={step.path}
            className={cn(
              'group flex items-center gap-4 rounded-lg border p-4 transition-all',
              step.current
                ? 'border-primary bg-primary/5'
                : step.completed
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-border bg-card hover:border-primary/50',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                step.current
                  ? 'bg-primary text-primary-foreground'
                  : step.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-800 text-zinc-400',
              )}
            >
              {step.completed ? '✓' : step.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-200">{step.title}</div>
              <p className="text-xs text-zinc-500">{step.description}</p>
            </div>
            {!step.completed && (
              <ArrowRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-1" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
