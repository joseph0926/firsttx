import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface ProblemSolutionProps {
  problem: string;
  solution: string;
  problemDetails?: string[];
  solutionDetails?: string[];
}

export function ProblemSolution({
  problem,
  solution,
  problemDetails,
  solutionDetails,
}: ProblemSolutionProps) {
  const { locale } = useI18n();
  const problemLabel = locale === 'ko' ? '확인할 점' : 'What to observe';
  const solutionLabel = locale === 'ko' ? '이 데모에서 보여 주는 동작' : 'What this demo shows';

  return (
    <div className="atlas-problem-solution">
      <article data-kind="problem">
        <div>
          <span>
            <AlertCircle aria-hidden="true" />
          </span>
          <h3>{problemLabel}</h3>
        </div>
        <p>{problem}</p>
        {problemDetails && problemDetails.length > 0 && (
          <ul>
            {problemDetails.map((detail, i) => (
              <li key={i}>
                <span aria-hidden="true">—</span>
                {detail}
              </li>
            ))}
          </ul>
        )}
      </article>
      <article data-kind="solution">
        <div>
          <span>
            <CheckCircle2 aria-hidden="true" />
          </span>
          <h3>{solutionLabel}</h3>
        </div>
        <p>{solution}</p>
        {solutionDetails && solutionDetails.length > 0 && (
          <ul>
            {solutionDetails.map((detail, i) => (
              <li key={i}>
                <span aria-hidden="true">+</span>
                {detail}
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
